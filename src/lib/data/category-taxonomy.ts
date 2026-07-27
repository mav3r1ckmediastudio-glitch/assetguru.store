export type CategoryAccent = 'cyan' | 'magenta' | 'violet' | 'amber' | 'green' | 'blue' | 'red';

export type CategoryTaxonomyItem = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  accent: CategoryAccent;
  sortOrder: number;
  subcategories: string[];
};

export const CATEGORY_TAXONOMY: CategoryTaxonomyItem[] = [
  {
    name: 'Characters & Creatures',
    slug: 'characters-creatures',
    description: 'Playable characters, NPCs, creatures, animals and character accessories.',
    icon: '◉',
    accent: 'cyan',
    sortOrder: 10,
    subcategories: ['Human Characters','Sci-Fi Characters','Fantasy Characters','Horror Characters','Creatures & Monsters','Animals','Character Accessories']
  },
  {
    name: 'Environments',
    slug: 'environments',
    description: 'Complete scenes, modular level kits, interiors and natural environments.',
    icon: '▦',
    accent: 'violet',
    sortOrder: 20,
    subcategories: ['Urban','Sci-Fi','Fantasy','Horror','Historical','Nature & Landscapes','Interiors','Modular Building Kits']
  },
  {
    name: 'Props & Objects',
    slug: 'props-objects',
    description: 'Production-ready objects for dressing, interaction and environmental storytelling.',
    icon: '⬡',
    accent: 'blue',
    sortOrder: 30,
    subcategories: ['Furniture','Industrial Props','Household Objects','Street Props','Decorative Props','Containers & Storage','Interactive Props']
  },
  {
    name: 'Weapons & Equipment',
    slug: 'weapons-equipment',
    description: 'Weapons, armour, clothing, tools and equipment for characters and gameplay.',
    icon: '✦',
    accent: 'magenta',
    sortOrder: 40,
    subcategories: ['Firearms','Melee Weapons','Sci-Fi Weapons','Fantasy Weapons','Armour','Clothing','Tools & Equipment']
  },
  {
    name: 'Vehicles',
    slug: 'vehicles',
    description: 'Land, air, water and science-fiction vehicles plus vehicle components.',
    icon: '◆',
    accent: 'amber',
    sortOrder: 50,
    subcategories: ['Land Vehicles','Aircraft','Watercraft','Sci-Fi Vehicles','Vehicle Parts']
  },
  {
    name: 'Animations',
    slug: 'animations',
    description: 'Character, creature, first-person and cinematic animation packs.',
    icon: '▶',
    accent: 'green',
    sortOrder: 60,
    subcategories: ['Character Movement','Combat','First-Person Arms','Interaction','Creature Animation','Cinematic Animation','Animation Packs']
  },
  {
    name: 'Textures & Materials',
    slug: 'textures-materials',
    description: 'PBR materials, terrain textures, decals, skies and reusable surface libraries.',
    icon: '▧',
    accent: 'cyan',
    sortOrder: 70,
    subcategories: ['PBR Materials','Terrain Textures','Decals','Surface Materials','Skies & Backgrounds']
  },
  {
    name: 'Visual Effects',
    slug: 'visual-effects',
    description: 'Particles, environmental effects, magic, explosions and lighting effects.',
    icon: '✺',
    accent: 'violet',
    sortOrder: 80,
    subcategories: ['Particles','Fire & Smoke','Weather','Magic Effects','Sci-Fi Effects','Explosions','Lighting Effects']
  },
  {
    name: 'Audio',
    slug: 'audio',
    description: 'Music, ambience, voices, interface sounds and gameplay sound-effect packs.',
    icon: '♫',
    accent: 'blue',
    sortOrder: 90,
    subcategories: ['Music','Ambient Sound','Weapons','Creatures','Voice Packs','Interface Sounds','Sound Effects']
  },
  {
    name: 'Scripts & Gameplay Systems',
    slug: 'scripts-gameplay-systems',
    description: 'Reusable scripts and systems for AI, inventory, quests, interaction and gameplay.',
    icon: '⌘',
    accent: 'green',
    sortOrder: 100,
    subcategories: ['AI Systems','Weapons Systems','Inventory','Quests & Dialogue','Interaction Systems','Survival Systems','Vehicles','Multiplayer','Utility Scripts']
  },
  {
    name: 'UI & HUD',
    slug: 'ui-hud',
    description: 'HUDs, menus, icons, interface packs and other player-facing UI assets.',
    icon: '▤',
    accent: 'magenta',
    sortOrder: 110,
    subcategories: ['HUDs','Menus','Icons','Inventory UI','Dialogue UI','Fonts','Interface Packs']
  },
  {
    name: 'Templates & Projects',
    slug: 'templates-projects',
    description: 'Starter projects, game templates, demo projects and complete system foundations.',
    icon: '◇',
    accent: 'amber',
    sortOrder: 120,
    subcategories: ['Game Templates','Demo Projects','Level Templates','Starter Kits','Complete Game Systems']
  }
];

export function taxonomyCategory(name: string) {
  return CATEGORY_TAXONOMY.find((item) => item.name === name);
}
