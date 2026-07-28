begin;

insert into public.categories(name, slug, description, icon, accent, sort_order, visible, featured)
values
('Characters & Creatures','characters-creatures','Playable characters, NPCs, creatures, animals and character accessories.','◉','cyan',10,true,false),
('Environments','environments','Complete scenes, modular level kits, interiors and natural environments.','▦','violet',20,true,false),
('Props & Objects','props-objects','Production-ready objects for dressing, interaction and environmental storytelling.','⬡','blue',30,true,false),
('Weapons & Equipment','weapons-equipment','Weapons, armour, clothing, tools and equipment for characters and gameplay.','✦','magenta',40,true,false),
('Vehicles','vehicles','Land, air, water and science-fiction vehicles plus vehicle components.','◆','amber',50,true,false),
('Animations','animations','Character, creature, first-person and cinematic animation packs.','▶','green',60,true,false),
('Textures & Materials','textures-materials','PBR materials, terrain textures, decals, skies and reusable surface libraries.','▧','cyan',70,true,false),
('Visual Effects','visual-effects','Particles, environmental effects, magic, explosions and lighting effects.','✺','violet',80,true,false),
('Audio','audio','Music, ambience, voices, interface sounds and gameplay sound-effect packs.','♫','blue',90,true,false),
('Scripts & Gameplay Systems','scripts-gameplay-systems','Reusable scripts and systems for AI, inventory, quests, interaction and gameplay.','⌘','green',100,true,false),
('UI & HUD','ui-hud','HUDs, menus, icons, interface packs and other player-facing UI assets.','▤','magenta',110,true,false),
('Templates & Projects','templates-projects','Starter projects, game templates, demo projects and complete system foundations.','◇','amber',120,true,false)
on conflict (name) do update set
  slug = excluded.slug,
  description = excluded.description,
  icon = excluded.icon,
  accent = excluded.accent,
  sort_order = excluded.sort_order,
  visible = true;

update public.products p set category_id = target.id
from public.categories legacy, public.categories target
where p.category_id = legacy.id and legacy.name = 'Characters' and target.name = 'Characters & Creatures';
update public.products p set category_id = target.id
from public.categories legacy, public.categories target
where p.category_id = legacy.id and legacy.name = 'Props' and target.name = 'Props & Objects';
update public.products p set category_id = target.id
from public.categories legacy, public.categories target
where p.category_id = legacy.id and legacy.name = 'Weapons' and target.name = 'Weapons & Equipment';
update public.products p set category_id = target.id
from public.categories legacy, public.categories target
where p.category_id = legacy.id and legacy.name = 'Materials & textures' and target.name = 'Textures & Materials';
update public.products p set category_id = target.id
from public.categories legacy, public.categories target
where p.category_id = legacy.id and legacy.name = 'Shaders & VFX' and target.name = 'Visual Effects';
update public.products p set category_id = target.id
from public.categories legacy, public.categories target
where p.category_id = legacy.id and legacy.name = 'Scripts & systems' and target.name = 'Scripts & Gameplay Systems';
update public.products p set category_id = target.id
from public.categories legacy, public.categories target
where p.category_id = legacy.id and legacy.name = 'UI & 2D' and target.name = 'UI & HUD';

update public.categories
set visible = false, featured = false
where name in ('Characters','Props','Weapons','Materials & textures','Shaders & VFX','Scripts & systems','UI & 2D');

commit;
