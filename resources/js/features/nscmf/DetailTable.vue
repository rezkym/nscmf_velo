<script setup lang="ts">
defineProps<{
    title: string;
    columns: { key: string; label: string }[];
    rows: Record<string, string>[];
}>();
</script>

<template>
    <div class="space-y-2">
        <h3 class="text-sm font-medium text-foreground">{{ title }}</h3>
        <p v-if="rows.length === 0" class="text-sm text-muted-foreground">None</p>
        <div v-else class="overflow-x-auto rounded-lg border border-border">
            <table class="min-w-full divide-y divide-border text-left text-sm">
                <thead class="bg-muted text-xs uppercase text-muted-foreground">
                    <tr>
                        <th v-for="column in columns" :key="column.key" scope="col" class="px-4 py-2">
                            {{ column.label }}
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    <tr v-for="(row, index) in rows" :key="index">
                        <td v-for="column in columns" :key="column.key" class="whitespace-pre-wrap px-4 py-2">
                            {{ row[column.key] }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
