<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use stdClass;

/**
 * Reads the real MySQL 8.4 information_schema so schema tests assert what the database
 * enforces, not what a migration file claims (16 §55, 11 §64–71).
 */
final class Schema
{
    /**
     * @return array<string, array{type: string, nullable: bool, default: string|null, extra: string}>
     */
    public static function columns(string $table): array
    {
        /** @var list<stdClass> $rows */
        $rows = DB::select(
            'select column_name as name, column_type as type, is_nullable as nullable, column_default as `default`, extra as extra
             from information_schema.columns where table_schema = database() and table_name = ? order by ordinal_position',
            [$table],
        );

        $columns = [];
        foreach ($rows as $row) {
            $columns[self::string($row->name)] = [
                'type' => self::string($row->type),
                'nullable' => $row->nullable === 'YES',
                'default' => is_string($row->default) ? $row->default : null,
                'extra' => self::string($row->extra),
            ];
        }

        return $columns;
    }

    public static function tableExists(string $table): bool
    {
        return DB::scalar(
            'select count(*) from information_schema.tables where table_schema = database() and table_name = ?',
            [$table],
        ) === 1;
    }

    /**
     * Unique indexes as name => ordered column list (functional parts appear as their expression).
     *
     * @return array<string, list<string>>
     */
    public static function uniqueIndexes(string $table): array
    {
        return self::indexes($table, unique: true);
    }

    /**
     * @return array<string, list<string>>
     */
    public static function indexes(string $table, ?bool $unique = null): array
    {
        /** @var list<stdClass> $rows */
        $rows = DB::select(
            'select index_name as name, coalesce(column_name, expression) as col, non_unique as non_unique
             from information_schema.statistics where table_schema = database() and table_name = ?
             order by index_name, seq_in_index',
            [$table],
        );

        $indexes = [];
        foreach ($rows as $row) {
            if ($unique !== null && ((int) self::string($row->non_unique) === 0) !== $unique) {
                continue;
            }
            $indexes[self::string($row->name)][] = self::string($row->col);
        }

        return $indexes;
    }

    /**
     * Foreign keys as column => [referenced table, referenced column, delete rule].
     *
     * @return array<string, array{0: string, 1: string, 2: string}>
     */
    public static function foreignKeys(string $table): array
    {
        /** @var list<stdClass> $rows */
        $rows = DB::select(
            'select k.column_name as col, k.referenced_table_name as ref_table, k.referenced_column_name as ref_col, r.delete_rule as delete_rule
             from information_schema.key_column_usage k
             join information_schema.referential_constraints r
               on r.constraint_schema = k.constraint_schema and r.constraint_name = k.constraint_name
             where k.table_schema = database() and k.table_name = ? and k.referenced_table_name is not null',
            [$table],
        );

        $keys = [];
        foreach ($rows as $row) {
            $keys[self::string($row->col)] = [
                self::string($row->ref_table),
                self::string($row->ref_col),
                self::string($row->delete_rule),
            ];
        }

        return $keys;
    }

    /**
     * Runs a write inside a savepoint and reports whether MySQL rejected it.
     *
     * @param  callable(): mixed  $write
     */
    public static function rejects(callable $write): bool
    {
        DB::beginTransaction();

        try {
            $write();
        } catch (QueryException) {
            return true;
        } finally {
            DB::rollBack();
        }

        return false;
    }

    private static function string(mixed $value): string
    {
        return is_scalar($value) ? (string) $value : '';
    }
}
