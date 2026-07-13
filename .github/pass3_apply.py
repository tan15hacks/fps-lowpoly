from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    content = file_path.read_text(encoding="utf-8")
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one match in {path}, found {count}: {old[:80]!r}")
    file_path.write_text(content.replace(old, new, 1), encoding="utf-8")


replace_once(
    "src/core/Game.ts",
    "import { calculateWeaponDamage } from '../utils/combatMath';\n",
    "import { calculateWeaponDamage } from '../utils/combatMath';\n"
    "import { cappedHealingRequest, lifeStealCap } from '../utils/combatState';\n",
)

replace_once(
    "src/core/Game.ts",
    "  damageAtWaveStart: number;\n  deathDialog?: HTMLElement;",
    "  damageAtWaveStart: number;\n  lifeStealHealedThisWave: number;\n  deathDialog?: HTMLElement;",
)

replace_once(
    "src/core/Game.ts",
    "        damageAtWaveStart: 0,\n      };",
    "        damageAtWaveStart: 0,\n        lifeStealHealedThisWave: 0,\n      };",
)

replace_once(
    "src/core/Game.ts",
    "    run.projectiles.onPlayerHit = (damage) =>\n      this.damagePlayer(damage, run.player.root.position);",
    "    run.projectiles.onPlayerHit = (damage, source) =>\n      this.damagePlayer(damage, source);",
)

replace_once(
    "src/core/Game.ts",
    "      run.damageAtWaveStart = run.stats.damageReceived;\n      run.outpost.beginWave();",
    "      run.damageAtWaveStart = run.stats.damageReceived;\n"
    "      run.lifeStealHealedThisWave = 0;\n"
    "      run.outpost.beginWave();",
)

replace_once(
    "src/core/Game.ts",
    "      const lifeSteal = run.upgrades.level('lifesteal');\n"
    "      if (lifeSteal > 0) {\n"
    "        run.playerStats.heal(Math.min(2.5, hit.damage * 0.02 * lifeSteal));\n"
    "      }",
    "      const lifeSteal = run.upgrades.level('lifesteal');\n"
    "      if (lifeSteal > 0) {\n"
    "        const request = cappedHealingRequest(\n"
    "          hit.damage * 0.02 * lifeSteal,\n"
    "          run.lifeStealHealedThisWave,\n"
    "          lifeStealCap(lifeSteal),\n"
    "        );\n"
    "        if (request.allowed > 0) {\n"
    "          const healed = run.playerStats.heal(request.allowed);\n"
    "          run.lifeStealHealedThisWave += healed;\n"
    "        }\n"
    "      }",
)

replace_once(
    "src/core/Game.ts",
    "    const direction = run.player.root.position.clone().sub(source).normalize();\n"
    "    this.bus.emit('damage-direction', direction);",
    "    const direction = run.player.root.position.clone().sub(source);\n"
    "    if (direction.lengthSq() <= 0.000001) direction.set(0, 0, 1);\n"
    "    else direction.normalize();\n"
    "    this.bus.emit('damage-direction', direction);",
)

replace_once(
    "src/weapons/WeaponManager.ts",
    "weapon.startReload(capacity, reloadMultiplier)",
    "weapon.startReload(reloadMultiplier, capacity)",
)

replace_once(
    "src/weapons/WeaponManager.ts",
    "weapon.startReload(capacity, reloadMultiplier);",
    "weapon.startReload(reloadMultiplier, capacity);",
)
