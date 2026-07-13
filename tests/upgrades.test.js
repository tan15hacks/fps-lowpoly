import { UpgradeManager } from '../src/upgrades/UpgradeManager';
import { permanentUpgradeCost, purchasePermanent } from '../src/upgrades/PermanentUpgradeManager';
import { defaultPermanent } from '../src/core/SaveManager';
describe('upgrades', () => {
    it('stacks run upgrades and returns multipliers', () => {
        const manager = new UpgradeManager();
        manager.apply('damage');
        manager.apply('damage');
        expect(manager.level('damage')).toBe(2);
        expect(manager.multiplier('damage', 0.12)).toBeCloseTo(1.24);
    });
    it('draws unique valid cards', () => {
        const manager = new UpgradeManager();
        const cards = manager.draw(3, new Set(['pistol']), () => 0.5);
        expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
        expect(cards.every((card) => !card.requiredWeapon || card.requiredWeapon === 'pistol')).toBe(true);
    });
    it('charges increasing permanent costs', () => {
        expect(permanentUpgradeCost('health', 1)).toBeGreaterThan(permanentUpgradeCost('health', 0));
        const result = purchasePermanent(defaultPermanent(), 1000, 'health');
        expect(result.purchased).toBe(true);
        expect(result.levels.health).toBe(1);
    });
});
