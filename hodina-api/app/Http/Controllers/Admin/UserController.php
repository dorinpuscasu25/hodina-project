<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\InteractsWithAdminTables;
use App\Http\Controllers\Admin\Concerns\InteractsWithTranslatedFields;
use App\Http\Controllers\Controller;
use App\Models\Guesthouse;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    use InteractsWithAdminTables, InteractsWithTranslatedFields;

    public function index(Request $request): Response
    {
        $search = $this->searchTerm($request);
        $perPage = $this->perPage($request);
        $like = $this->like($search);

        return Inertia::render('admin/users/index', [
            'users' => User::query()
                ->with('guesthouse')
                ->when($search, function ($query) use ($like) {
                    $query->where(function ($nestedQuery) use ($like) {
                        $nestedQuery
                            ->whereRaw('LOWER(name) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(email) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(COALESCE(phone, \'\')) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(role) LIKE ?', [$like])
                            ->orWhereHas('guesthouse', fn ($guesthouseQuery) => $guesthouseQuery->whereRaw('LOWER(CAST(name AS TEXT)) LIKE ?', [$like]));
                    });
                })
                ->orderByRaw("case when role = 'admin' then 0 when role = 'host' then 1 else 2 end")
                ->orderBy('name')
                ->paginate($perPage)
                ->withQueryString()
                ->through(fn (User $user) => $this->userTableRow($user)),
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
            ],
            'perPageOptions' => $this->perPageOptions(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/users/form', [
            'mode' => 'create',
            'user' => $this->userFormData(),
            'guesthouseOptions' => $this->guesthouseOptions(),
            'roleOptions' => $this->roleOptions(),
            'guesthouseRoleOptions' => $this->guesthouseRoleOptions(),
            'locales' => $this->supportedLocaleOptions(),
        ]);
    }

    public function edit(User $user): Response
    {
        return Inertia::render('admin/users/form', [
            'mode' => 'edit',
            'user' => $this->userFormData($user),
            'guesthouseOptions' => $this->guesthouseOptions(),
            'roleOptions' => $this->roleOptions(),
            'guesthouseRoleOptions' => $this->guesthouseRoleOptions(),
            'locales' => $this->supportedLocaleOptions(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        return $this->persist($request, new User(), true);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        return $this->persist($request, $user, false);
    }

    private function persist(Request $request, User $user, bool $creating): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user)],
            'password' => [$creating ? 'required' : 'nullable', 'string', 'min:8', 'confirmed'],
            'role' => ['required', Rule::in([User::ROLE_ADMIN, User::ROLE_HOST, User::ROLE_GUEST])],
            'phone' => ['nullable', 'string', 'max:50'],
            'locale' => ['required', Rule::in($this->supportedLocales())],
            'timezone' => ['required', 'string', 'max:255'],
            'guesthouse_id' => ['nullable', Rule::exists('guesthouses', 'id')],
            'guesthouse_role' => ['nullable', Rule::in(array_column($this->guesthouseRoleOptions(), 'value'))],
            'is_active' => ['required', 'boolean'],
        ]);

        if ($validated['role'] === User::ROLE_HOST && blank($validated['guesthouse_id'] ?? null)) {
            return back()->withErrors([
                'guesthouse_id' => 'Alege pensiunea pentru contul de host.',
            ]);
        }

        if ($validated['role'] === User::ROLE_HOST && blank($validated['guesthouse_role'] ?? null)) {
            return back()->withErrors([
                'guesthouse_role' => 'Alege rolul in organizatie pentru contul de host.',
            ]);
        }

        $emailChanged = $user->exists && $user->email !== $validated['email'];

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
            'locale' => $validated['locale'],
            'timezone' => $validated['timezone'],
            'guesthouse_id' => $validated['role'] === User::ROLE_HOST ? $validated['guesthouse_id'] : null,
            'guesthouse_role' => $validated['role'] === User::ROLE_HOST ? ($validated['guesthouse_role'] ?? User::GUESTHOUSE_ROLE_OWNER) : null,
            'is_active' => $validated['is_active'],
        ]);

        if (filled($validated['password'] ?? null)) {
            $user->password = $validated['password'];
        }

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        $user->save();

        if ($emailChanged && ! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        return to_route('admin.users.index');
    }

    private function userTableRow(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'guesthouse_role' => $user->guesthouse_role,
            'locale' => $user->locale,
            'timezone' => $user->timezone,
            'guesthouse_id' => $user->guesthouse_id,
            'guesthouse_name' => $user->guesthouse?->translated('name', 'ro'),
            'is_active' => $user->is_active,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }

    private function userFormData(?User $user = null): array
    {
        if ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'password' => '',
                'password_confirmation' => '',
                'role' => $user->role,
                'guesthouse_role' => $user->guesthouse_role ?? User::GUESTHOUSE_ROLE_OWNER,
                'phone' => $user->phone ?? '',
                'locale' => $user->locale,
                'timezone' => $user->timezone,
                'guesthouse_id' => $user->guesthouse_id ?? '',
                'is_active' => $user->is_active,
            ];
        }

        return [
            'id' => null,
            'name' => '',
            'email' => '',
            'password' => '',
            'password_confirmation' => '',
            'role' => User::ROLE_HOST,
            'guesthouse_role' => User::GUESTHOUSE_ROLE_OWNER,
            'phone' => '',
            'locale' => 'ro',
            'timezone' => 'Europe/Chisinau',
            'guesthouse_id' => '',
            'is_active' => true,
        ];
    }

    private function guesthouseOptions(): array
    {
        return Guesthouse::query()
            ->orderBy('id')
            ->get()
            ->map(fn (Guesthouse $guesthouse) => [
                'id' => $guesthouse->id,
                'name' => $guesthouse->translated('name', 'ro'),
            ])
            ->values()
            ->all();
    }

    private function roleOptions(): array
    {
        return [
            ['value' => User::ROLE_ADMIN, 'label' => 'Admin'],
            ['value' => User::ROLE_HOST, 'label' => 'Host'],
            ['value' => User::ROLE_GUEST, 'label' => 'Guest'],
        ];
    }

    private function guesthouseRoleOptions(): array
    {
        return [
            ['value' => User::GUESTHOUSE_ROLE_OWNER, 'label' => 'Owner'],
            ['value' => User::GUESTHOUSE_ROLE_MANAGER, 'label' => 'Manager'],
            ['value' => User::GUESTHOUSE_ROLE_EDITOR, 'label' => 'Editor'],
            ['value' => User::GUESTHOUSE_ROLE_VIEWER, 'label' => 'Viewer'],
        ];
    }
}
