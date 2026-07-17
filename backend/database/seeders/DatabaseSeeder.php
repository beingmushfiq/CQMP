<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create roles
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        Role::firstOrCreate(['name' => 'Admin']);
        Role::firstOrCreate(['name' => 'Receptionist']);
        Role::firstOrCreate(['name' => 'Doctor']);
        Role::firstOrCreate(['name' => 'Patient']);

        // Create super admin user
        $admin = User::factory()->create([
            'name'  => 'Super Admin',
            'email' => 'admin@cqmp.local',
        ]);
        $admin->assignRole($superAdmin);

        // Create Doctor user
        $docRole = Role::firstOrCreate(['name' => 'Doctor']);
        $doctorUser = User::factory()->create([
            'name'  => 'Doctor User',
            'email' => 'doctor@cqmp.local',
        ]);
        $doctorUser->assignRole($docRole);

        // Create Receptionist user
        $recRole = Role::firstOrCreate(['name' => 'Receptionist']);
        $receptionistUser = User::factory()->create([
            'name'  => 'Receptionist User',
            'email' => 'receptionist@cqmp.local',
        ]);
        $receptionistUser->assignRole($recRole);

        // Create TV user
        $tvRole = Role::firstOrCreate(['name' => 'TV']);
        $tvUser = User::factory()->create([
            'name'  => 'TV Board Display',
            'email' => 'tv@cqmp.local',
        ]);
        $tvUser->assignRole($tvRole);

        // Create demo clinic
        $clinic = Clinic::create([
            'name'    => 'Metro Health Care',
            'address' => '123 Health Street, Dhaka',
            'phone'   => '+880-1700-000000',
            'settings' => [
                'serial_prefix' => '',
                'serial_padding' => 3,
                'timezone' => 'Asia/Dhaka',
                'locale' => 'bn',
            ],
        ]);

        // Create demo doctors
        Doctor::create([
            'clinic_id'                  => $clinic->id,
            'name'                       => 'Dr. Sarah Rahman',
            'specialization'             => 'Cardiologist',
            'average_consultation_time'  => 15,
            'break_message'              => 'চিকিৎসক সাময়িক বিরতিতে আছেন।',
            'english_break_message'      => 'Doctor is on a short break.',
            'is_available'               => true,
        ]);

        // Create demo announcements
        Announcement::create([
            'title'      => 'Welcome Announcement',
            'message_bn' => 'মেট্রো হেলথ কেয়ারে আপনাকে স্বাগতম। অনুগ্রহ করে আপনার সিরিয়াল নম্বরের জন্য অপেক্ষা করুন।',
            'message_en' => 'Welcome to Metro Health Care. Please wait for your serial number to be called.',
            'is_active'  => true,
        ]);
    }
}
