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
        // Reset cached roles and permissions safely
        try {
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        } catch (\Throwable $e) {
            // Ignore if cache or permission tables are not yet created
        }

        // Create roles
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin']);
        Role::firstOrCreate(['name' => 'Admin']);
        Role::firstOrCreate(['name' => 'Receptionist']);
        Role::firstOrCreate(['name' => 'Doctor']);
        Role::firstOrCreate(['name' => 'Patient']);

        // Create super admin user
        $admin = User::firstOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'name'              => 'Super Admin',
                'email_verified_at' => now(),
                'password'          => \Illuminate\Support\Facades\Hash::make('12345678'),
            ]
        );
        $admin->assignRole($superAdmin);

        // Create Doctor user
        $docRole = Role::firstOrCreate(['name' => 'Doctor']);
        $doctorUser = User::firstOrCreate(
            ['email' => 'doctor@gmail.com'],
            [
                'name'              => 'Doctor',
                'email_verified_at' => now(),
                'password'          => \Illuminate\Support\Facades\Hash::make('12345678'),
            ]
        );
        $doctorUser->assignRole($docRole);

        // Create Receptionist user
        $recRole = Role::firstOrCreate(['name' => 'Receptionist']);
        $receptionistUser = User::firstOrCreate(
            ['email' => 'receptionist@gmail.com'],
            [
                'name'              => 'Receptionist',
                'email_verified_at' => now(),
                'password'          => \Illuminate\Support\Facades\Hash::make('12345678'),
            ]
        );
        $receptionistUser->assignRole($recRole);

        // Create TV user
        $tvRole = Role::firstOrCreate(['name' => 'TV']);
        $tvUser = User::firstOrCreate(
            ['email' => 'tv@gmail.com'],
            [
                'name'              => 'TV',
                'email_verified_at' => now(),
                'password'          => \Illuminate\Support\Facades\Hash::make('12345678'),
            ]
        );
        $tvUser->assignRole($tvRole);


        // Create demo clinic
        $clinic = Clinic::firstOrCreate(
            ['name' => 'Feroza Medicine Corner'],
            [
                'address'  => 'Dhaka, Bangladesh',
                'phone'    => '+880-1700-000000',
                'settings' => [
                    'serial_prefix'  => '',
                    'serial_padding' => 3,
                    'timezone'       => 'Asia/Dhaka',
                    'locale'         => 'bn',
                ],
            ]
        );

        // Create demo doctor
        Doctor::firstOrCreate(
            ['name' => 'Dr. Muhammad Asif Sattar (MBBS MPH)', 'clinic_id' => $clinic->id],
            [
                'specialization'            => 'General Practitioner',
                'average_consultation_time' => 15,
                'break_message'             => 'বিরতি চলছে। অনুগ্রহ করে অপেক্ষা করুন।',
                'english_break_message'     => 'Doctor is on a break. Please wait.',
                'is_available'              => true,
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | Default Announcement
        |--------------------------------------------------------------------------
        */

        Announcement::firstOrCreate(
            ['title' => 'Welcome Announcement'],
            [
                'message_bn' => 'ফেরোজা মেডিসিন কর্নারে আপনাকে স্বাগতম। অনুগ্রহ করে আপনার সিরয়াল নম্বরের জন্য অপেক্ষা করুন।',
                'message_en' => 'Welcome to Feroza Medicine Corner. Please wait for your serial number to be called.',
                'is_active'  => true,
            ]
        );
    }
}
