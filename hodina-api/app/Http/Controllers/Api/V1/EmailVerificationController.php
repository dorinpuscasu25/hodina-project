<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    public function __invoke(Request $request, int $id, string $hash): RedirectResponse
    {
        $user = User::findOrFail($id);

        abort_unless(hash_equals((string) $hash, sha1($user->getEmailForVerification())), 403);

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        $target = match ($user->role) {
            User::ROLE_HOST => rtrim(config('hodina.dashboard_url'), '/').'/login?verified=1',
            User::ROLE_ADMIN => rtrim(config('app.url'), '/').'/admin/login?verified=1',
            default => rtrim(config('hodina.frontend_url'), '/').'?verified=1',
        };

        return redirect()->away($target);
    }
}
