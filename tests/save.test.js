import { createDefaultSave, migrateSave, validateImportedSave } from '../src/core/SaveManager';
describe('save data', () => {
    it('migrates and clamps invalid values', () => {
        const migrated = migrateSave({ schemaVersion: 1, credits: -4, permanent: { health: 99 } });
        expect(migrated.credits).toBe(0);
        expect(migrated.permanent.health).toBe(5);
        expect(migrated.schemaVersion).toBe(2);
    });
    it('validates imported saves', () => {
        expect(validateImportedSave({ credits: 4 }).valid).toBe(false);
        expect(validateImportedSave(createDefaultSave()).valid).toBe(true);
    });
});
