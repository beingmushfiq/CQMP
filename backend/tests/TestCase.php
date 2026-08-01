<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Helper to attach JWT Bearer token to request.
     */
    protected function actingAsJwt(\App\Models\User $user): static
    {
        $token = \App\Services\JwtService::generateToken($user);
        return $this->withHeader('Authorization', 'Bearer ' . $token);
    }
}
