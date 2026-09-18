<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\QueueDay;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class QueueApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);

        $this->admin = User::factory()->create(['password' => bcrypt('password')]);
        $this->admin->assignRole('Super Admin');
    }

    // ── AUTH TESTS ──────────────────────────────────────────────────────

    public function test_can_login_with_valid_credentials(): void
    {
        $response = $this->postJson('/api/v1/login', [
            'email'    => $this->admin->email,
            'password' => 'password',
        ]);

        $response->assertOk()
                 ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'roles']]);
    }

    public function test_rejects_invalid_credentials(): void
    {
        $response = $this->postJson('/api/v1/login', [
            'email'    => $this->admin->email,
            'password' => 'wrong-password',
        ]);

        $response->assertUnprocessable();
    }

    public function test_can_retrieve_authenticated_user(): void
    {
        $response = $this->actingAsJwt($this->admin)
                         ->getJson('/api/v1/me');

        $response->assertOk()->assertJsonPath('data.name', $this->admin->name);
    }

    public function test_can_logout(): void
    {
        $this->actingAsJwt($this->admin)
             ->postJson('/api/v1/logout')
             ->assertOk();
    }

    // ── QUEUE TESTS ──────────────────────────────────────────────────────

    public function test_can_open_queue_for_doctor(): void
    {
        $clinic = Clinic::factory()->create();
        $doctor = Doctor::factory()->create(['clinic_id' => $clinic->id]);

        $response = $this->actingAsJwt($this->admin)
                         ->postJson('/api/v1/queue/open', ['doctor_id' => $doctor->id]);

        $response->assertOk()->assertJsonStructure(['queue_day_id', 'status']);
    }

    public function test_can_add_walkin_patient_to_queue(): void
    {
        $clinic   = Clinic::factory()->create();
        $doctor   = Doctor::factory()->create(['clinic_id' => $clinic->id]);
        $patient  = Patient::factory()->create();
        $queueDay = QueueDay::factory()->create([
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'date'      => Carbon::today()->toDateString(),
            'status'    => 'opened',
        ]);

        $response = $this->actingAsJwt($this->admin)
                         ->postJson('/api/v1/queue/create', [
                             'queue_day_id' => $queueDay->id,
                             'patient_id'   => $patient->id,
                         ]);

        $response->assertCreated()
                 ->assertJsonStructure(['data' => ['id', 'serial_no', 'status', 'patient']]);
        $this->assertEquals(1, $response->json('data.serial_no'));
        $this->assertEquals('Waiting', $response->json('data.status'));
    }

    public function test_assigns_sequential_serials_to_walkin_patients(): void
    {
        $clinic   = Clinic::factory()->create();
        $doctor   = Doctor::factory()->create(['clinic_id' => $clinic->id]);
        $queueDay = QueueDay::factory()->create([
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'date'      => Carbon::today()->toDateString(),
            'status'    => 'opened',
        ]);
        $p1 = Patient::factory()->create();
        $p2 = Patient::factory()->create();

        $r1 = $this->actingAsJwt($this->admin)
                   ->postJson('/api/v1/queue/create', ['queue_day_id' => $queueDay->id, 'patient_id' => $p1->id]);
        $r2 = $this->actingAsJwt($this->admin)
                   ->postJson('/api/v1/queue/create', ['queue_day_id' => $queueDay->id, 'patient_id' => $p2->id]);

        $r1->assertCreated();
        $r2->assertCreated();

        $this->assertEquals(1, $r1->json('data.serial_no'));
        $this->assertEquals(2, $r2->json('data.serial_no'));
    }

    public function test_can_call_next_patient(): void
    {
        $clinic   = Clinic::factory()->create();
        $doctor   = Doctor::factory()->create(['clinic_id' => $clinic->id]);
        $patient  = Patient::factory()->create();
        $queueDay = QueueDay::factory()->create([
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'date'      => Carbon::today()->toDateString(),
            'status'    => 'opened',
        ]);

        $this->actingAsJwt($this->admin)
             ->postJson('/api/v1/queue/create', ['queue_day_id' => $queueDay->id, 'patient_id' => $patient->id]);

        $response = $this->actingAsJwt($this->admin)
                         ->postJson('/api/v1/queue/call-next', ['queue_day_id' => $queueDay->id]);

        $response->assertOk();
        $this->assertEquals('Called', $response->json('queue_item.status') ?? $response->json('queue_item.data.status'));
    }

    public function test_rejects_walkin_for_blocked_patient(): void
    {
        $clinic   = Clinic::factory()->create();
        $doctor   = Doctor::factory()->create(['clinic_id' => $clinic->id]);
        $patient  = Patient::factory()->create(['is_blocked' => true, 'blocked_reason' => 'No-show history']);
        $queueDay = QueueDay::factory()->create([
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'date'      => Carbon::today()->toDateString(),
            'status'    => 'opened',
        ]);

        $response = $this->actingAsJwt($this->admin)
                         ->postJson('/api/v1/queue/create', [
                             'queue_day_id' => $queueDay->id,
                             'patient_id'   => $patient->id,
                         ]);

        $response->assertForbidden();
    }

    public function test_can_reinsert_patient(): void
    {
        $clinic   = Clinic::factory()->create();
        $doctor   = Doctor::factory()->create(['clinic_id' => $clinic->id]);
        $queueDay = QueueDay::factory()->create([
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'date'      => Carbon::today()->toDateString(),
            'status'    => 'opened',
        ]);
        $p1 = Patient::factory()->create();
        $p2 = Patient::factory()->create();

        $item1 = $this->actingAsJwt($this->admin)
                     ->postJson('/api/v1/queue/create', ['queue_day_id' => $queueDay->id, 'patient_id' => $p1->id])
                     ->json('data');

        $item2 = $this->actingAsJwt($this->admin)
                     ->postJson('/api/v1/queue/create', ['queue_day_id' => $queueDay->id, 'patient_id' => $p2->id])
                     ->json('data');

        // Let's reinsert item 2 at position 1 (front of waiting line)
        $response = $this->actingAsJwt($this->admin)
                         ->postJson('/api/v1/queue/reinsert', [
                             'queue_item_id' => $item2['id'],
                             'position'      => 1,
                         ]);

        $response->assertOk();
        // Crucial requirement: original serial numbers MUST NOT change!
        $this->assertEquals(2, \App\Models\QueueItem::find($item2['id'])->serial_no);
        $this->assertEquals(1, \App\Models\QueueItem::find($item1['id'])->serial_no);
        // But queue_order must position item2 ahead of item1
        $this->assertEquals(1, \App\Models\QueueItem::find($item2['id'])->queue_order);
        $this->assertEquals(2, \App\Models\QueueItem::find($item1['id'])->queue_order);
    }

    public function test_can_complete_queue_item(): void
    {
        $clinic   = Clinic::factory()->create();
        $doctor   = Doctor::factory()->create(['clinic_id' => $clinic->id]);
        $queueDay = QueueDay::factory()->create([
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'date'      => Carbon::today()->toDateString(),
            'status'    => 'opened',
        ]);
        $patient = Patient::factory()->create();

        $item = $this->actingAsJwt($this->admin)
                     ->postJson('/api/v1/queue/create', ['queue_day_id' => $queueDay->id, 'patient_id' => $patient->id])
                     ->json('data');

        $response = $this->actingAsJwt($this->admin)
                         ->postJson('/api/v1/queue/complete', [
                             'queue_item_id' => $item['id'],
                         ]);

        $response->assertOk();
        $this->assertEquals('Completed', \App\Models\QueueItem::find($item['id'])->status);
    }

    public function test_can_complete_queue_item_when_no_remaining_waiting_items(): void
    {
        $clinic   = Clinic::factory()->create();
        $doctor   = Doctor::factory()->create(['clinic_id' => $clinic->id]);
        $queueDay = QueueDay::factory()->create([
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'date'      => Carbon::today()->toDateString(),
            'status'    => 'opened',
        ]);
        $patient = Patient::factory()->create();

        $item = $this->actingAsJwt($this->admin)
                     ->postJson('/api/v1/queue/create', ['queue_day_id' => $queueDay->id, 'patient_id' => $patient->id])
                     ->json('data');

        // Complete the only item in queue (recalculateWaitTimes will encounter empty waiting collection)
        $response = $this->actingAsJwt($this->admin)
                         ->postJson('/api/v1/queue/complete', [
                             'queue_item_id' => $item['id'],
                         ]);

        $response->assertOk();
        $this->assertEquals('Completed', \App\Models\QueueItem::find($item['id'])->status);
    }

    public function test_can_skip_queue_item(): void
    {
        $clinic   = Clinic::factory()->create();
        $doctor   = Doctor::factory()->create(['clinic_id' => $clinic->id]);
        $queueDay = QueueDay::factory()->create([
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'date'      => Carbon::today()->toDateString(),
            'status'    => 'opened',
        ]);
        $patient = Patient::factory()->create();

        $item = $this->actingAsJwt($this->admin)
                     ->postJson('/api/v1/queue/create', ['queue_day_id' => $queueDay->id, 'patient_id' => $patient->id])
                     ->json('data');

        $response = $this->actingAsJwt($this->admin)
                         ->postJson('/api/v1/queue/skip', [
                             'queue_item_id' => $item['id'],
                         ]);

        $response->assertOk();
        $this->assertEquals('Skipped', \App\Models\QueueItem::find($item['id'])->status);
    }

    public function test_public_booking_updates_patient_name_when_phone_matches(): void
    {
        $clinic = Clinic::factory()->create();
        $doctor = Doctor::factory()->create(['clinic_id' => $clinic->id, 'is_available' => true]);

        // Pre-existing patient with phone number and old name
        Patient::factory()->create([
            'name'  => 'Mushfiq',
            'phone' => '01700000000',
        ]);

        // Book public serial with same phone number but new name
        $response = $this->postJson('/api/v1/public/book', [
            'name'      => 'Aayan',
            'phone'     => '01700000000',
            'doctor_id' => $doctor->id,
        ]);

        $response->assertOk()
                 ->assertJsonPath('patient.name', 'Aayan');

        $this->assertDatabaseHas('patients', [
            'phone' => '01700000000',
            'name'  => 'Aayan',
        ]);
    }

    public function test_can_delete_queue_item(): void
    {
        $clinic   = Clinic::factory()->create();
        $doctor   = Doctor::factory()->create(['clinic_id' => $clinic->id]);
        $queueDay = QueueDay::factory()->create([
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'date'      => Carbon::today()->toDateString(),
            'status'    => 'opened',
        ]);
        $patient = Patient::factory()->create();

        $item = $this->actingAsJwt($this->admin)
                     ->postJson('/api/v1/queue/create', ['queue_day_id' => $queueDay->id, 'patient_id' => $patient->id])
                     ->json('data');

        $response = $this->actingAsJwt($this->admin)
                         ->deleteJson("/api/v1/queue/{$item['id']}");

        $response->assertOk();
        $this->assertDatabaseMissing('queue_items', ['id' => $item['id']]);
    }

    public function test_can_call_specific_patient(): void
    {
        $clinic   = Clinic::factory()->create();
        $doctor   = Doctor::factory()->create(['clinic_id' => $clinic->id]);
        $queueDay = QueueDay::factory()->create([
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'date'      => Carbon::today()->toDateString(),
            'status'    => 'opened',
        ]);
        $p1 = Patient::factory()->create();
        $p2 = Patient::factory()->create();

        $item1 = $this->actingAsJwt($this->admin)
                     ->postJson('/api/v1/queue/create', ['queue_day_id' => $queueDay->id, 'patient_id' => $p1->id])
                     ->json('data');

        $item2 = $this->actingAsJwt($this->admin)
                     ->postJson('/api/v1/queue/create', ['queue_day_id' => $queueDay->id, 'patient_id' => $p2->id])
                     ->json('data');

        // Call item 2 directly (even though item 1 was first in line)
        $response = $this->actingAsJwt($this->admin)
                         ->postJson('/api/v1/queue/call', [
                             'queue_item_id' => $item2['id'],
                         ]);

        $response->assertOk();
        $this->assertEquals('Called', \App\Models\QueueItem::find($item2['id'])->status);
        $this->assertEquals('Waiting', \App\Models\QueueItem::find($item1['id'])->status);
    }

    public function test_can_update_custom_serial_without_mutating_others(): void
    {
        $clinic   = Clinic::factory()->create();
        $doctor   = Doctor::factory()->create(['clinic_id' => $clinic->id]);
        $queueDay = QueueDay::factory()->create([
            'clinic_id' => $clinic->id,
            'doctor_id' => $doctor->id,
            'date'      => Carbon::today()->toDateString(),
            'status'    => 'opened',
        ]);
        $p1 = Patient::factory()->create();
        $p2 = Patient::factory()->create();

        $item1 = $this->actingAsJwt($this->admin)
                     ->postJson('/api/v1/queue/create', ['queue_day_id' => $queueDay->id, 'patient_id' => $p1->id])
                     ->json('data');

        $item2 = $this->actingAsJwt($this->admin)
                     ->postJson('/api/v1/queue/create', ['queue_day_id' => $queueDay->id, 'patient_id' => $p2->id])
                     ->json('data');

        // Position custom serial 99 for item 2
        $response = $this->actingAsJwt($this->admin)
                         ->postJson('/api/v1/queue/update-serial', [
                             'queue_item_id' => $item2['id'],
                             'serial_no'     => 99,
                         ]);

        $response->assertOk();
        $this->assertEquals(99, \App\Models\QueueItem::find($item2['id'])->serial_no);
        $this->assertEquals(1, \App\Models\QueueItem::find($item1['id'])->serial_no); // Item 1 is completely untouched!
    }
}

