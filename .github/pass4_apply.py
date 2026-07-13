from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    content = file_path.read_text(encoding="utf-8")
    count = content.count(old)
    if count != 1:
        raise RuntimeError(
            f"Expected exactly one match in {path}, found {count}: {old[:100]!r}"
        )
    file_path.write_text(content.replace(old, new, 1), encoding="utf-8")


replace_once(
    "src/core/Game.ts",
    "        this.particles,\n        this.audio,\n      );\n      const weapons = new WeaponManager(",
    "        this.particles,\n"
    "        this.audio,\n"
    "        () => this.save.value.settings.maxEnemies,\n"
    "      );\n"
    "      const weapons = new WeaponManager(",
)

replace_once(
    "src/core/Game.ts",
    "    run.waves.onSpawn = (kind) =>\n"
    "      run.enemies.spawn(kind, run.waves.wave, run.difficulty);",
    "    run.waves.onSpawn = (kind, spawnIndex) =>\n"
    "      Boolean(\n"
    "        run.enemies.spawn(\n"
    "          kind,\n"
    "          run.waves.wave,\n"
    "          run.difficulty,\n"
    "          spawnIndex,\n"
    "        ),\n"
    "      );",
)
