import { describe, expect, it } from 'vitest';

import { chunkPlan, fileProblem, type AttachmentPolicy } from './attachmentPolicy';

const POLICY: AttachmentPolicy = {
    max_files: 10,
    max_bytes: 20_000_000,
    chunk_bytes: 5_242_880,
    extensions: ['pdf', 'xls', 'xlsx', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'txt', 'csv'],
};

const file = (name: string, size: number) => ({ name, size });

describe('Attachment file rules (FE-40 AC3)', () => {
    it('accepts 1 to 20,000,000 bytes inclusive and rejects empty or larger files', () => {
        expect(fileProblem(file('a.pdf', 19_999_999), POLICY, 0)).toBeNull();
        expect(fileProblem(file('a.pdf', 20_000_000), POLICY, 0)).toBeNull();
        expect(fileProblem(file('a.pdf', 20_000_001), POLICY, 0)).toBe('A file may be at most 20,000,000 bytes.');
        expect(fileProblem(file('a.pdf', 0), POLICY, 0)).toBe('An empty file cannot be attached.');
    });

    it('allows only the listed types, case-insensitively, and never executables or macro files', () => {
        expect(fileProblem(file('Plan.PDF', 10), POLICY, 0)).toBeNull();
        for (const name of ['setup.exe', 'run.sh', 'book.xlsm', 'letter.docm', 'noextension', 'archive.pdf.exe']) {
            expect(fileProblem(file(name, 10), POLICY, 0)).toBe('This file type is not allowed.');
        }
    });

    it('stops at ten active attachments', () => {
        expect(fileProblem(file('a.pdf', 10), POLICY, 9)).toBeNull();
        expect(fileProblem(file('a.pdf', 10), POLICY, 10)).toBe('A record may have at most 10 attachments.');
    });

    it('rejects a filename longer than 255 characters', () => {
        expect(fileProblem(file(`${'a'.repeat(252)}.pdf`, 10), POLICY, 0)).toBe(
            'The file name may be at most 255 characters.',
        );
    });
});

describe('Chunk geometry (FE-41 AC1)', () => {
    it('cuts 5 MiB chunks, 1-based, with the remainder last and no empty chunk', () => {
        expect(chunkPlan(5_242_881, 5_242_880)).toEqual([
            { index: 1, start: 0, end: 5_242_880 },
            { index: 2, start: 5_242_880, end: 5_242_881 },
        ]);
        expect(chunkPlan(10_485_760, 5_242_880).map((chunk) => chunk.index)).toEqual([1, 2]);
        expect(chunkPlan(1, 5_242_880)).toEqual([{ index: 1, start: 0, end: 1 }]);
    });
});
