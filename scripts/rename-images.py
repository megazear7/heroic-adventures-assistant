#!/usr/bin/env python3
"""
Rename image files to descriptive snake_case names,
create JSON metadata under assets/content/assets/,
and update all references in content markdown files.
"""
import json
import os
import subprocess
import re
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
STATIC_ASSETS = BASE / "static" / "assets"
CONTENT_ASSETS = BASE / "assets" / "content" / "assets"

# Manual mapping: old filename -> new snake_case name (without extension)
NAME_MAP = {
    "image1":  "heroic_adventures_logo",
    "image2":  "alpine_valley_mountain_range",
    "image5":  "adventuring_party_planning",
    "image6":  "traveler_in_wheat_field",
    "image7":  "market_stall_food_exchange",
    "image8":  "medieval_village_street",
    "image9":  "warriors_approaching_archway",
    "image10": "traveler_approaching_town",
    "image11": "elven_companions_mountain_path",
    "image12": "dwarf_warrior_sketch",
    "image13": "female_warrior_sketch",
    "image14": "two_protagonists_stone_street",
    "image15": "elven_duo_back_to_back",
    "image16": "veteran_warrior_warhammer",
    "image17": "young_adventurers_forest",
    "image18": "dwarf_adventurer_snowy_pass",
    "image19": "hooded_elf_archer_rogue",
    "image20": "three_adventurers_canyon",
    "image21": "warrior_charging_from_cave",
    "image22": "wizard_with_staff",
    "image23": "elf_rogue_medieval_street",
    "image24": "rugged_warrior_warhammer",
    "image25": "authoritative_mage_stone_portal",
    "image26": "armored_figure_sunlit_city",
    "image27": "warrior_mage_fireball",
    "image28": "orc_warrior_lunging",
    "image29": "elf_casting_magic_spark",
    "image30": "hooded_archer_in_forest",
    "image31": "soldiers_approaching_fortress",
    "image32": "mage_with_glowing_book",
    "image33": "spectral_blue_flame",
    "image34": "ornate_tiles_stone_ground",
    "image35": "hand_reaching_into_leaves",
    "image36": "wizard_casting_energy_burst",
    "image37": "barrel_backpack_sword_still_life",
    "image38": "three_suits_of_armor",
    "image39": "five_armored_outfits",
    "image40": "three_armor_suits_rock_wall",
    "image41": "three_armor_suits_garden",
    "image42": "stone_forge_brazier_cave",
    "image43": "three_shields_stone_wall",
    "image44": "three_circular_shields_top_down",
    "image45": "three_shields_display",
    "image46": "viking_shield_wall_advance",
    "image47": "medieval_weapons_display",
    "image48": "ornate_mace_weapon",
    "image49": "spear_vertical_display",
    "image50": "hand_axe_illustration",
    "image51": "medieval_sword_illustration",
    "image52": "warhammer_vertical_display",
    "image53": "five_swords_in_stone",
    "image54": "seven_swords_stone_ledge",
    "image55": "sword_on_black_background",
    "image56": "three_axes_stone_floor",
    "image57": "three_hammers_display",
    "image58": "war_mace_axe_hybrid",
    "image59": "five_spears_rock_wall",
    "image60": "row_of_arrows_in_ground",
    "image61": "glass_jars_stone_hall",
    "image62": "rustic_maproom_interior",
    "image63": "parchment_scroll_candlelight",
    "image64": "medieval_market_street",
    "image65": "medieval_courtyard_stable",
    "image66": "medieval_siege_scene",
    "image67": "travelers_snowy_mountain_pass",
    "image68": "warrior_standard_bearer",
    "image69": "archer_exiting_cave_snow",
    "image70": "commander_studying_map",
    "image71": "isometric_game_board_well",
    "image72": "isometric_three_characters",
    "image73": "isometric_board_three_figures",
    "image74": "isometric_characters_tiled_floor",
    "image75": "fortified_mountain_city",
    "image76": "warrior_versus_dragon",
    "image77": "action_check_table",
    "image78": "traveler_approaching_castle",
    "image79": "goblin_orc_warriors_plain",
    "image80": "skeleton_warriors_emerging",
    "image81": "two_orc_ogres_narrow_pass",
    "image82": "menacing_wolf_pack_canyon",
    "image83": "giant_serpent_cave_battle",
    "image84": "goblin_troll_forest",
    "image85": "giant_spider_cave_encounter",
    "image86": "dinosaur_in_forest",
    "image87": "giant_versus_warrior_valley",
    "image88": "werewolf_snowy_village",
    "image89": "horned_warrior_stormy_sky",
    "image90": "demon_versus_heroes",
    "image91": "dragon_overlooking_valley",
    "image92": "sea_serpent_attacking_shore",
    "image93": "dragon_versus_army",
    "image94": "printable_monster_entry_form",
    "image95": "blank_page",
    "image96": "printable_character_sheet",
}


def get_dimensions(filepath):
    """Get image width and height using sips (macOS)."""
    try:
        result = subprocess.run(
            ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(filepath)],
            capture_output=True, text=True, timeout=10
        )
        width = int(re.search(r"pixelWidth:\s*(\d+)", result.stdout).group(1))
        height = int(re.search(r"pixelHeight:\s*(\d+)", result.stdout).group(1))
        return width, height
    except Exception as e:
        print(f"  WARNING: Could not get dimensions for {filepath}: {e}")
        return 0, 0


def make_alt_text(name):
    """Convert snake_case name to title-like alt text."""
    return name.replace("_", " ").title()


def main():
    # Load descriptions
    desc_data = json.load(open(BASE / "image-descriptions.json"))
    images = desc_data["images"]

    # Build lookup: old basename (no ext) -> image entry
    desc_lookup = {}
    for img in images:
        old_basename = Path(img["path"]).stem  # e.g. "image1"
        desc_lookup[old_basename] = img

    # Ensure content assets dir exists
    CONTENT_ASSETS.mkdir(parents=True, exist_ok=True)

    renames = {}  # old_filename -> new_filename (with ext)
    json_files_created = 0

    for old_base, new_base in sorted(NAME_MAP.items()):
        img_entry = desc_lookup.get(old_base)
        if not img_entry:
            print(f"WARNING: No description found for {old_base}")
            continue

        old_path = Path(img_entry["path"])
        ext = old_path.suffix  # .png or .jpeg
        old_filename = old_path.name  # image1.png
        new_filename = f"{new_base}{ext}"

        old_full = STATIC_ASSETS / old_filename
        new_full = STATIC_ASSETS / new_filename

        if not old_full.exists():
            print(f"WARNING: File not found: {old_full}")
            continue

        # Get dimensions
        width, height = get_dimensions(old_full)

        # Rename file
        print(f"  {old_filename} -> {new_filename} ({width}x{height})")
        old_full.rename(new_full)
        renames[old_filename] = new_filename

        # Create short description (first meaningful sentence, max 200 chars)
        desc = img_entry["description"]
        # Get first sentence that's actually descriptive
        short_desc = ""
        for line in desc.split("\n"):
            line = line.strip().lstrip("- ")
            if len(line) > 30 and not line.startswith("Key ") and not line.startswith("Overall ") and not line.startswith("Image type") and not line.startswith("Scene ") and not line.startswith("Detailed visual"):
                short_desc = line
                # Truncate at first period if over 200 chars
                if len(short_desc) > 200:
                    period_idx = short_desc.find(".", 50)
                    if period_idx > 0:
                        short_desc = short_desc[:period_idx + 1]
                break
        if not short_desc:
            short_desc = desc[:200].strip()

        # Create JSON metadata
        json_data = {
            "file": f"assets/{new_filename}",
            "alt": make_alt_text(new_base),
            "description": short_desc,
            "width": width,
            "height": height,
        }

        json_path = CONTENT_ASSETS / f"{new_base}.json"
        json_path.write_text(json.dumps(json_data, indent=4) + "\n")
        json_files_created += 1

    print(f"\nRenamed {len(renames)} files")
    print(f"Created {json_files_created} JSON metadata files")

    # Update references in content markdown files
    # Content files use paths like: assets/images/media/image11.jpeg
    # We need to update these to use the new filenames
    content_dir = BASE / "assets" / "content" / "entries"
    updated_files = 0

    for md_file in content_dir.rglob("*.md"):
        text = md_file.read_text()
        new_text = text
        for old_filename, new_filename in renames.items():
            # Match patterns like assets/images/media/image11.jpeg
            old_stem = Path(old_filename).stem  # image11
            old_ext = Path(old_filename).suffix  # .jpeg
            pattern = f"assets/images/media/{old_stem}{old_ext}"
            replacement = f"assets/{new_filename}"
            new_text = new_text.replace(pattern, replacement)

        if new_text != text:
            md_file.write_text(new_text)
            updated_files += 1

    print(f"Updated {updated_files} content markdown files")

    # Also update static HTML/JS files
    static_dir = BASE / "static"
    for ext_glob in ["*.html", "*.js", "*.css"]:
        for static_file in static_dir.glob(ext_glob):
            text = static_file.read_text()
            new_text = text
            for old_filename, new_filename in renames.items():
                new_text = new_text.replace(old_filename, new_filename)
            if new_text != text:
                static_file.write_text(new_text)
                print(f"Updated static file: {static_file.name}")

    # Update image-descriptions.json with new paths
    for img in images:
        old_filename = Path(img["path"]).name
        if old_filename in renames:
            img["path"] = f"static/assets/{renames[old_filename]}"

    with open(BASE / "image-descriptions.json", "w") as f:
        json.dump(desc_data, f, indent=2)
        f.write("\n")
    print("Updated image-descriptions.json")


if __name__ == "__main__":
    main()
