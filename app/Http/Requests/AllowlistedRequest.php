<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * A Form Request whose top-level body keys are an exact allowlist (12 §106, 15 Architecture-01):
 * an unexpected key is a 422, never silently ignored.
 */
abstract class AllowlistedRequest extends FormRequest
{
    private const array TRANSPORT_KEYS = ['_token', '_method'];

    /**
     * @return list<string>
     */
    abstract protected function allowedKeys(): array;

    /**
     * Permissions of which the actor needs at least one, checked before validation so an
     * unauthorized actor learns nothing from validation messages. Services re-check.
     *
     * @return list<string>
     */
    protected function anyPermission(): array
    {
        return [];
    }

    public function authorize(): bool
    {
        $permissions = $this->anyPermission();
        $user = $this->user();

        if ($permissions === []) {
            return true;
        }

        return $user !== null && array_any($permissions, fn (string $permission): bool => $user->can($permission));
    }

    /**
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $body = $this->isMethod('GET') ? [] : $this->request->all();

            foreach (array_keys($body) as $key) {
                $key = (string) $key;

                if (! in_array($key, [...$this->allowedKeys(), ...self::TRANSPORT_KEYS], true)) {
                    $validator->errors()->add($key, 'This field is not accepted.');
                }
            }
        }];
    }
}
