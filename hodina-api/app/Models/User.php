<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, TwoFactorAuthenticatable;

    public const ROLE_ADMIN = 'admin';
    public const ROLE_HOST = 'host';
    public const ROLE_GUEST = 'guest';
    public const GUESTHOUSE_ROLE_OWNER = 'owner';
    public const GUESTHOUSE_ROLE_MANAGER = 'manager';
    public const GUESTHOUSE_ROLE_EDITOR = 'editor';
    public const GUESTHOUSE_ROLE_VIEWER = 'viewer';

    protected $fillable = [
        'name',
        'email',
        'password',
        'guesthouse_id',
        'role',
        'guesthouse_role',
        'phone',
        'locale',
        'timezone',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::created(function (self $user): void {
            if (! $user->hasVerifiedEmail()) {
                $user->sendEmailVerificationNotification();
            }
        });
    }

    public function guesthouse(): BelongsTo
    {
        return $this->belongsTo(Guesthouse::class);
    }

    public function guestBookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'guest_user_id');
    }

    public function sentMessages(): HasMany
    {
        return $this->hasMany(BookingMessage::class, 'sender_id');
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isHost(): bool
    {
        return $this->role === self::ROLE_HOST;
    }

    public function isGuesthouseOwner(): bool
    {
        return $this->guesthouse_role === self::GUESTHOUSE_ROLE_OWNER;
    }

    public function canManageGuesthouseTeam(): bool
    {
        return in_array($this->guesthouse_role, [
            self::GUESTHOUSE_ROLE_OWNER,
            self::GUESTHOUSE_ROLE_MANAGER,
        ], true);
    }

    public function isGuest(): bool
    {
        return $this->role === self::ROLE_GUEST;
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role,
            'guesthouse_role' => $this->guesthouse_role,
            'locale' => $this->locale,
            'timezone' => $this->timezone,
            'email_verified' => $this->hasVerifiedEmail(),
            'guesthouse_id' => $this->guesthouse_id,
            'is_active' => $this->is_active,
        ];
    }
}
