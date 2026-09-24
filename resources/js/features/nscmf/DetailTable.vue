<script setup lang="ts">
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

defineProps<{
    title: string;
    columns: { key: string; label: string }[];
    rows: Record<string, string>[];
}>();
</script>

<template>
    <div class="grid gap-2">
        <h3 class="font-medium">{{ title }}</h3>
        <p v-if="rows.length === 0" class="text-muted-foreground">None</p>
        <div v-else class="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead v-for="column in columns" :key="column.key" class="px-3">
                            {{ column.label }}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-for="(row, index) in rows" :key="index">
                        <TableCell v-for="column in columns" :key="column.key" class="whitespace-pre-wrap px-3">
                            {{ row[column.key] }}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    </div>
</template>
