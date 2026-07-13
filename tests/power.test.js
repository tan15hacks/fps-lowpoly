import { PowerGrid } from '../src/outpost/PowerGrid';
describe('power grid', () => {
    it('prevents allocation over ten units', () => {
        const grid = new PowerGrid();
        expect(grid.used()).toBe(10);
        expect(grid.set('scanner', true)).toBe(false);
        expect(grid.set('healing', false)).toBe(true);
        expect(grid.set('scanner', true)).toBe(true);
        expect(grid.used()).toBe(9);
    });
});
