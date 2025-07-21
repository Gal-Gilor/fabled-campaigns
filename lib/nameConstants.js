/**
 * @file lib/nameConstants.js
 * @description Contains constants for names, adjectives, and nouns.
 * This module is universal and can be used in Node.js and browser environments.
 */

const RACE_NAMES = {
  human: {
    male: ['Aldric', 'Gareth', 'Marcus', 'Cedric', 'Magnus', 'Roland', 'Darian', 'Victor', 'Adrian', 'Cassius',
      'Baldwin', 'Conrad', 'Edmund', 'Frederick', 'Geoffrey', 'Henry', 'Jasper', 'Leopold', 'Nicholas', 'Oliver',
      'Patrick', 'Quinton', 'Richard', 'Sebastian', 'Theodore', 'Ulrich', 'Vincent', 'William', 'Xavier', 'Zachary'],
    female: ['Lyra', 'Sera', 'Elena', 'Aria', 'Vera', 'Isabella', 'Celeste', 'Miranda', 'Valeria', 'Ophelia',
      'Anastasia', 'Beatrice', 'Catherine', 'Diana', 'Evangeline', 'Francesca', 'Genevieve', 'Helena', 'Isadora', 'Josephine',
      'Katherine', 'Lillian', 'Magdalena', 'Natasha', 'Octavia', 'Penelope', 'Rosalind', 'Seraphina', 'Theodora', 'Victoria'],
    neutral: ['Sage', 'River', 'Jordan', 'Phoenix', 'Vale', 'Quinn', 'Rowan', 'Blair', 'Ember', 'Alex',
      'Avery', 'Cameron', 'Dakota', 'Ellis', 'Finley', 'Gray', 'Harper', 'Indigo', 'Jules', 'Kai',
      'Lane', 'Morgan', 'Nova', 'Ocean', 'Parker', 'Rebel', 'Storm', 'True', 'Vale', 'Wren'],
    surnames: ['Blackstone', 'Ironhold', 'Goldleaf', 'Brightblade', 'Stormwind', 'Redmane', 'Whitehawk', 'Ashford', 'Thornfield', 'Ravenwood',
      'Aldermore', 'Barrington', 'Cromwell', 'Dunmore', 'Eastwood', 'Fairfax', 'Greyson', 'Hawthorn', 'Lancaster', 'Montague',
      'Northridge', 'Pemberton', 'Rothwell', 'Silverton', 'Westbrook', 'Kingsley', 'Blackwood', 'Redfield', 'Goldwin', 'Steelhart']
  },
  elf: {
    male: ['Aelindra', 'Silvyr', 'Thalion', 'Erevan', 'Galinndan', 'Mindartis', 'Quarion', 'Riardon', 'Rolen', 'Suhnaal'],
    female: ['Adrie', 'Caelynn', 'Dara', 'Enna', 'Galinndan', 'Halimath', 'Lamlis', 'Mindartis', 'Nutae', 'Paelynn'],
    neutral: ['Aramil', 'Berrian', 'Dayereth', 'Enna', 'Galinndan', 'Halimath', 'Heian', 'Himo', 'Immeral', 'Ivellios'],
    surnames: ['Amakir', 'Amakus', 'Galanodel', 'Holimion', 'Liadon', 'Meliamne', 'Nailo', 'Siannodel', 'Xiloscient', 'Alderleaf']
  },
  dwarf: {
    male: ['Adrik', 'Baern', 'Darrak', 'Eberk', 'Fargrim', 'Gardain', 'Harbek', 'Kildrak', 'Morgran', 'Thorek'],
    female: ['Amber', 'Bardryn', 'Diesa', 'Eldeth', 'Gunnloda', 'Helja', 'Kathra', 'Kristryd', 'Mardred', 'Riswynn'],
    neutral: ['Adrik', 'Baern', 'Darrak', 'Diesa', 'Eldeth', 'Fargrim', 'Gunnloda', 'Harbek', 'Kathra', 'Morgran'],
    surnames: ['Battlehammer', 'Brawnanvil', 'Dankil', 'Fireforge', 'Frostbeard', 'Gorunn', 'Holderhek', 'Ironfist', 'Loderr', 'Lutgehr']
  },
  halfling: {
    male: ['Alton', 'Ander', 'Bernie', 'Bobbin', 'Cade', 'Callus', 'Corrin', 'Dannad', 'Garret', 'Lindal'],
    female: ['Andry', 'Bree', 'Callie', 'Cora', 'Euphemia', 'Jillian', 'Kithri', 'Lavinia', 'Lidda', 'Merla'],
    neutral: ['Alton', 'Andry', 'Bernie', 'Bree', 'Cade', 'Callie', 'Corrin', 'Garret', 'Jillian', 'Lindal'],
    surnames: ['Brushgather', 'Goodbarrel', 'Greenbottle', 'High-hill', 'Hilltopple', 'Leagallow', 'Tealeaf', 'Thorngage', 'Tosscobble', 'Underbough']
  },
  dragonborn: {
    male: ['Arjhan', 'Balasar', 'Bharash', 'Donaar', 'Ghesh', 'Heskan', 'Kriv', 'Medrash', 'Nadarr', 'Pandjed'],
    female: ['Akra', 'Biri', 'Daar', 'Farideh', 'Harann', 'Kava', 'Korinn', 'Mishann', 'Nala', 'Perra'],
    neutral: ['Arjhan', 'Akra', 'Bharash', 'Biri', 'Donaar', 'Farideh', 'Ghesh', 'Harann', 'Kriv', 'Mishann'],
    surnames: ['Clethtinthiallor', 'Daardendrian', 'Delmirev', 'Drachedandion', 'Fenkenkabradon', 'Kepeshkmolik', 'Kerrhylon', 'Kimbatuul', 'Linxakasendalor', 'Myastan']
  },
  gnome: {
    male: ['Alston', 'Alvyn', 'Boddynock', 'Brocc', 'Burgell', 'Dimble', 'Eldon', 'Erky', 'Fonkin', 'Frug'],
    female: ['Bimpnottin', 'Breena', 'Caramip', 'Carlin', 'Donella', 'Duvamil', 'Ella', 'Ellyjoybell', 'Ellywick', 'Lilli'],
    neutral: ['Alston', 'Bimpnottin', 'Boddynock', 'Breena', 'Burgell', 'Caramip', 'Dimble', 'Donella', 'Eldon', 'Ella'],
    surnames: ['Beren', 'Daergel', 'Folkor', 'Garrick', 'Nackle', 'Murnig', 'Ningel', 'Raulnor', 'Scheppen', 'Timbers']
  },
  tiefling: {
    male: ['Akmenos', 'Amnon', 'Barakas', 'Damakos', 'Ekemon', 'Iados', 'Kairon', 'Leucis', 'Melech', 'Mordai'],
    female: ['Akta', 'Anakir', 'Bryseis', 'Criella', 'Damaia', 'Ea', 'Kallista', 'Lerissa', 'Makaria', 'Nemeia'],
    neutral: ['Art', 'Carrion', 'Chant', 'Creed', 'Despair', 'Excellence', 'Fear', 'Glory', 'Hope', 'Ideal'],
    surnames: ['Ambition', 'Carrion', 'Chant', 'Creed', 'Despair', 'Excellence', 'Fear', 'Glory', 'Hope', 'Ideal']
  },
  orc: {
    male: ['Dench', 'Feng', 'Gell', 'Henk', 'Holg', 'Imsh', 'Keth', 'Krusk', 'Mhurren', 'Ront'],
    female: ['Baggi', 'Emen', 'Engong', 'Kansif', 'Myev', 'Neega', 'Ovak', 'Ownka', 'Shautha', 'Sutha'],
    neutral: ['Dench', 'Baggi', 'Feng', 'Emen', 'Gell', 'Engong', 'Henk', 'Kansif', 'Holg', 'Myev'],
    surnames: ['Bloodfang', 'Boulderfist', 'Burnhide', 'Crackbones', 'Firerock', 'Ironskull', 'Redaxe', 'Scarbones', 'Skullsplitter', 'Warclaw']
  },
  tabaxi: {
    male: ['Cloud on the Mountaintop', 'Five Timber', 'Jade Shoe', 'Left-Handed Hummingbird', 'Seven Thundercloud', 'Skirt of Snakes', 'Smoking Mirror'],
    female: ['Autumn in Her Eyes', 'Dancing Cloud', 'Ember of Stars', 'Falling Leaf', 'Night Whisper', 'River of Gold', 'Wind Through Grass'],
    neutral: ['Distant Rain', 'Fire in the Sky', 'Moon over Water', 'Shadow of Trees', 'Song of Birds', 'Star in Daylight', 'Thunder Walker'],
    surnames: ['Cloudchaser', 'Nightprowler', 'Stormcaller', 'Moonwhisper', 'Sunstrider', 'Mistwalker', 'Stargazer', 'Windrunner', 'Shadowtail', 'Brightclaw']
  },
  warforged: {
    male: ['Blade', 'Breaker', 'Cloud', 'Compass', 'Crystal', 'Finder', 'Fixe', 'Guide', 'Honor', 'Hunter'],
    female: ['Baker', 'Dreamer', 'Healer', 'Hope', 'Idealist', 'Joy', 'Lamp', 'Meter', 'Muse', 'Peace'],
    neutral: ['Alpha', 'Banner', 'Bastion', 'Bulwark', 'Chassis', 'Cipher', 'Construct', 'Engine', 'Forge', 'Gear',
      'Iron', 'Logic', 'Matrix', 'Node', 'Onyx', 'Prism', 'Quartz', 'Relic', 'Steel', 'Titan'],
    surnames: ['d\'Cannith', 'd\'Deneith', 'd\'Ghallanda', 'd\'Jorasco', 'd\'Kundarak', 'd\'Lyrandar', 'd\'Medani', 'd\'Orien', 'd\'Phiarlan', 'd\'Sivis']
  },
  kobold: {
    male: ['Arix', 'Eks', 'Ett', 'Galax', 'Gax', 'Ixen', 'Jank', 'Krag', 'Kreet', 'Meepo'],
    female: ['Bhek', 'Eek', 'Emi', 'Hix', 'Imx', 'Irxes', 'Kas', 'Krik', 'Nak', 'Pex'],
    neutral: ['Yip', 'Yap', 'Yek', 'Yak', 'Yix', 'Yox', 'Yuk', 'Yek', 'Yip', 'Yop'],
    surnames: ['Scaleclipper', 'Rustgnaw', 'Flamesnout', 'Ironjaw', 'Shieldbreaker', 'Spearpoint', 'Trapfinder', 'Tunneldigger', 'Warpsnarl', 'Axebiter']
  },
  goliath: {
    male: ['Aukan', 'Eglath', 'Gae-Al', 'Gauthak', 'Ilikan', 'Keothi', 'Kuori', 'Lo-Kag', 'Manneo', 'Maveith'],
    female: ['Akannathi', 'Eunkathka', 'Gunnloda', 'Iekika', 'Katho-Olavi', 'Kenkarthka', 'Liadra', 'Manakathi', 'Nalla', 'Orilo'],
    neutral: ['Thuliaga', 'Thunukalathi', 'Vaimei-Laga', 'Vekka', 'Vimak', 'Vimarka', 'Yamnathka', 'Yolanda', 'Yugol', 'Yvonna'],
    surnames: ['Anakalathai', 'Elanithino', 'Gathakanathi', 'Kalagiano', 'Katho-Olavi', 'Kolae-Gileana', 'Ogolakanu', 'Thuliaga', 'Thunukalathi', 'Vaimei-Laga']
  }
};

const TERRAIN_ELEMENTS = {
  forest: {
    adjectives: ['Whispering', 'Ancient', 'Deep', 'Wild', 'Emerald', 'Shadowed', 'Thornwood', 'Silverleaf', 'Moss-covered', 'Elven'],
    nouns: ['Grove', 'Thicket', 'Glade', 'Clearing', 'Canopy', 'Hollow', 'Wood', 'Dell', 'Glen', 'Bower'],
    modifiers: ['pines', 'oaks', 'willows', 'birches', 'cedars', 'maples', 'aspens', 'elms', 'firs', 'spruces']
  },
  grassland: {
    adjectives: ['Rolling', 'Verdant', 'Endless', 'Golden', 'Windswept', 'Peaceful', 'Fertile', 'Sun-kissed', 'Wild', 'Pastoral'],
    nouns: ['Plains', 'Fields', 'Meadows', 'Prairies', 'Steppes', 'Pastures', 'Ranges', 'Lands', 'Reaches', 'Expanse'],
    modifiers: ['grass', 'flowers', 'herbs', 'seeds', 'winds', 'paths', 'streams', 'wildlife', 'skies']
  },
  hills: {
    adjectives: ['Rolling', 'Gentle', 'Green', 'Pastoral', 'Terraced', 'Grassy', 'Windswept', 'Ancient', 'Sacred', 'Peaceful'],
    nouns: ['Hills', 'Highlands', 'Downs', 'Moors', 'Slopes', 'Ridges', 'Knolls', 'Rise', 'Elevation', 'Heights'],
    modifiers: ['slopes', 'paths', 'streams', 'stones', 'wildflowers', 'ancient_markers', 'shepherds', 'winds', 'views']
  },
  mountain: {
    adjectives: ['Towering', 'Snow-capped', 'Jagged', 'Windswept', 'Granite', 'Crystal', 'Storm-touched', 'Iron', 'Eagle\'s', 'Cloudbreak'],
    nouns: ['Peak', 'Ridge', 'Summit', 'Crag', 'Spire', 'Precipice', 'Outcrop', 'Bluff', 'Tor', 'Pinnacle'],
    modifiers: ['heights', 'slopes', 'passes', 'cliffs', 'crags', 'stones', 'rocks', 'boulders', 'ledges']
  },
  desert: {
    adjectives: ['Burning', 'Endless', 'Shifting', 'Golden', 'Scorching', 'Mirage', 'Sandswept', 'Sun-baked', 'Nomad\'s', 'Oasis'],
    nouns: ['Dunes', 'Wastes', 'Expanse', 'Reach', 'Sands', 'Basin', 'Flats', 'Mesa', 'Plateau', 'Valley'],
    modifiers: ['sands', 'stones', 'winds', 'mirages', 'cacti', 'bones', 'ruins', 'wells', 'springs', 'tracks']
  },
  ocean: {
    adjectives: ['Tidal', 'Coral', 'Storm-tossed', 'Pearl', 'Sapphire', 'Misty', 'Siren\'s', 'Deep', 'Salt-spray', 'Windward'],
    nouns: ['Bay', 'Cove', 'Harbor', 'Port', 'Inlet', 'Strait', 'Sound', 'Reef', 'Atoll', 'Lagoon'],
    modifiers: ['waves', 'tides', 'shores', 'reefs', 'pearls', 'shells', 'currents', 'depths', 'sailors', 'storms']
  },
  swamp: {
    adjectives: ['Murky', 'Mist-shrouded', 'Rotting', 'Fetid', 'Boggy', 'Willow', 'Crocodile', 'Stagnant', 'Poisonous', 'Witch\'s'],
    nouns: ['Marsh', 'Bog', 'Fen', 'Mire', 'Bayou', 'Wetlands', 'Morass', 'Quagmire', 'Slough', 'Backwater'],
    modifiers: ['reeds', 'moss', 'mist', 'pools', 'gases', 'vines', 'roots', 'mud', 'lilies', 'frogs']
  },
  underground: {
    adjectives: ['Deep', 'Echoing', 'Crystal', 'Shadowed', 'Forgotten', 'Dwarf-carved', 'Glowing', 'Limestone', 'Stalactite', 'Hidden'],
    nouns: ['Caverns', 'Tunnels', 'Chambers', 'Depths', 'Halls', 'Passages', 'Grottos', 'Vaults', 'Warrens', 'Sanctum'],
    modifiers: ['crystals', 'echoes', 'shadows', 'stones', 'pools', 'formations', 'minerals', 'veins', 'darkness', 'silence']
  },
  tundra: {
    adjectives: ['Frozen', 'Windswept', 'Barren', 'Ice-bound', 'Permafrost', 'Aurora', 'Polar', 'Blizzard', 'Glacier', 'Nordic', 'Glacial', 'Icy', 'Bitter', 'Howling', 'Endless', 'White', 'Crystalline', 'Frigid'],
    nouns: ['Plains', 'Wastes', 'Steppes', 'Expanse', 'Fields', 'Reaches', 'Grounds', 'Lands', 'Territory', 'Domain', 'Glacier', 'Icefield', 'Shelf', 'Berg', 'Floe', 'Pack', 'Sheet', 'Tundra'],
    modifiers: ['ice', 'snow', 'winds', 'cold', 'frost', 'storms', 'lights', 'silence', 'tracks', 'crystals', 'chill', 'freeze']
  },
  grassland: {
    adjectives: ['Rolling', 'Verdant', 'Endless', 'Golden', 'Windswept', 'Peaceful', 'Fertile', 'Sun-kissed', 'Wild', 'Pastoral'],
    nouns: ['Plains', 'Fields', 'Meadows', 'Prairies', 'Steppes', 'Pastures', 'Ranges', 'Lands', 'Reaches', 'Expanse'],
    modifiers: ['grass', 'flowers', 'herbs', 'seeds', 'winds', 'paths', 'streams', 'wildlife', 'skies']
  },
  jungle: {
    adjectives: ['Dense', 'Steaming', 'Verdant', 'Primal', 'Untamed', 'Lush', 'Tropical', 'Humid', 'Ancient', 'Overgrown'],
    nouns: ['Jungle', 'Rainforest', 'Canopy', 'Undergrowth', 'Thicket', 'Tangle', 'Wilderness', 'Grove', 'Basin', 'Expanse'],
    modifiers: ['vines', 'leaves', 'humidity', 'sounds', 'calls', 'mist', 'trees', 'branches', 'roots', 'shadows']
  },
  volcanic: {
    adjectives: ['Smoldering', 'Molten', 'Fiery', 'Ash-covered', 'Steaming', 'Lava-touched', 'Scorched', 'Blazing', 'Sulfurous', 'Burning'],
    nouns: ['Crater', 'Caldera', 'Slope', 'Peak', 'Flow', 'Field', 'Ridge', 'Vent', 'Formation', 'Range'],
    modifiers: ['lava', 'ash', 'smoke', 'flames', 'heat', 'sulfur', 'steam', 'embers', 'magma', 'rock']
  },
  coastal: {
    adjectives: ['Windswept', 'Salty', 'Rocky', 'Misty', 'Tide-swept', 'Jagged', 'Weathered', 'Storm-battered', 'Peaceful', 'Secluded'],
    nouns: ['Coast', 'Shore', 'Beach', 'Cliff', 'Cove', 'Bay', 'Inlet', 'Point', 'Headland', 'Strand'],
    modifiers: ['waves', 'salt', 'spray', 'tides', 'shells', 'rocks', 'sand', 'gulls', 'wind', 'foam']
  },
  badlands: {
    adjectives: ['Cracked', 'Barren', 'Desolate', 'Broken', 'Eroded', 'Harsh', 'Unforgiving', 'Scarred', 'Twisted', 'Forsaken'],
    nouns: ['Badlands', 'Wastes', 'Flats', 'Mesa', 'Butte', 'Gorge', 'Canyon', 'Ravine', 'Plateau', 'Outcrop'],
    modifiers: ['dust', 'rocks', 'cracks', 'erosion', 'bones', 'heat', 'stone', 'clay', 'sediment', 'wind']
  },
  urban: {
    adjectives: ['Bustling', 'Crowded', 'Sprawling', 'Ancient', 'Industrial', 'Noble', 'Merchant', 'Cobblestone', 'Walled', 'Metropolitan'],
    nouns: ['District', 'Quarter', 'Ward', 'Square', 'Street', 'Plaza', 'Market', 'Alley', 'Boulevard', 'Avenue'],
    modifiers: ['buildings', 'streets', 'crowds', 'merchants', 'guards', 'nobles', 'commoners', 'shops', 'inns', 'guilds']
  },
  industrial: {
    adjectives: ['Smoke-filled', 'Mechanized', 'Steam-powered', 'Clanking', 'Grimy', 'Forge-lit', 'Working', 'Bustling', 'Noisy', 'Production'],
    nouns: ['Factory', 'Workshop', 'Foundry', 'Mill', 'Forge', 'Facility', 'Plant', 'Works', 'Complex', 'District'],
    modifiers: ['machinery', 'steam', 'smoke', 'workers', 'gears', 'pipes', 'furnaces', 'tools', 'noise', 'production']
  },
  indoor: {
    adjectives: ['Enclosed', 'Candlelit', 'Furnished', 'Comfortable', 'Sheltered', 'Private', 'Decorated', 'Warm', 'Spacious', 'Intimate'],
    nouns: ['Hall', 'Chamber', 'Room', 'Study', 'Parlor', 'Gallery', 'Suite', 'Salon', 'Library', 'Quarters'],
    modifiers: ['furniture', 'tapestries', 'candles', 'fireplaces', 'books', 'art', 'comfort', 'privacy', 'warmth', 'luxury']
  },
  underdark: {
    adjectives: ['Abyssal', 'Twilight', 'Fungal', 'Echoing', 'Alien', 'Phosphorescent', 'Eerie', 'Forgotten', 'Primordial', 'Nightmare'],
    nouns: ['Depths', 'Abyss', 'Realm', 'Expanse', 'Caverns', 'Tunnels', 'Passages', 'Galleries', 'Chambers', 'Hollows'],
    modifiers: ['fungi', 'luminescence', 'whispers', 'shadows', 'creatures', 'spores', 'darkness', 'silence', 'mysteries', 'terrors']
  },
  feywild: {
    adjectives: ['Enchanted', 'Whimsical', 'Dreamlike', 'Mystical', 'Vibrant', 'Ethereal', 'Fey-touched', 'Magical', 'Otherworldly', 'Shimmering'],
    nouns: ['Grove', 'Glade', 'Realm', 'Court', 'Garden', 'Clearing', 'Dell', 'Sanctuary', 'Haven', 'Domain'],
    modifiers: ['magic', 'colors', 'sprites', 'illusions', 'wonder', 'dreams', 'music', 'laughter', 'flowers', 'butterflies']
  },
  shadowfell: {
    adjectives: ['Shadow', 'Grim', 'Sorrowful', 'Dark', 'Melancholy', 'Cursed', 'Bleak', 'Desolate', 'Haunted', 'Mournful'],
    nouns: ['Gloom', 'Shadow', 'Realm', 'Expanse', 'Wastes', 'Reaches', 'Domain', 'Plane', 'Territory', 'Region'],
    modifiers: ['shadows', 'despair', 'sorrow', 'gloom', 'spirits', 'echoes', 'memories', 'regret', 'loss', 'mourning']
  }
};

const PLACE_TYPES = {
  tavern: ['Tavern', 'Inn', 'Alehouse', 'Lodge', 'Rest'],
  village: ['Village', 'Hamlet', 'Crossing', 'Haven', 'Rest'],
  fortress: ['Fortress', 'Keep', 'Stronghold', 'Bastion', 'Redoubt'],
  castle: ['Castle', 'Palace', 'Court', 'Manor', 'Estate'],
  tower: ['Tower', 'Spire', 'Pinnacle', 'Beacon', 'Observatory'],
  temple: ['Temple', 'Shrine', 'Sanctuary', 'Cathedral', 'Abbey'],
  ruins: ['Ruins', 'Remnants', 'Remains', 'Wreckage', 'Relics'],
  cave: ['Cave', 'Cavern', 'Grotto', 'Hollow', 'Den'],
  mine: ['Mine', 'Quarry', 'Excavation', 'Pit', 'Shaft'],
  campsite: ['Campsite', 'Camp', 'Encampment', 'Refuge', 'Bivouac'],
  crossroads: ['Crossroads', 'Junction', 'Intersection', 'Meeting Point', 'Crossways'],
  bridge: ['Bridge', 'Crossing', 'Span', 'Causeway', 'Viaduct'],
  'trading-post': ['Trading Post', 'Marketplace', 'Exchange', 'Outpost', 'Station'],
  docks: ['Docks', 'Harbor', 'Port', 'Wharf', 'Marina'],
  dungeon: ['Dungeon', 'Depths', 'Catacombs', 'Labyrinth', 'Sanctum'],
  market: ['Market', 'Bazaar', 'Fair', 'Exchange', 'Square'],
  arena: ['Arena', 'Colosseum', 'Stadium', 'Amphitheater', 'Ring'],
  academy: ['Academy', 'School', 'Institute', 'College', 'University'],
  library: ['Library', 'Archive', 'Repository', 'Scriptorium', 'Study'],
  workshop: ['Workshop', 'Forge', 'Studio', 'Atelier', 'Laboratory'],
  graveyard: ['Graveyard', 'Cemetery', 'Necropolis', 'Burial Ground', 'Tomb'],
  ship: ['Ship', 'Vessel', 'Craft', 'Boat', 'Galleon'],
  sewer: ['Sewer', 'Drain', 'Tunnel', 'Conduit', 'Channel'],
  city: ['City', 'Metropolis', 'Capital', 'Settlement', 'Municipality'],
  town: ['Town', 'Borough', 'Settlement', 'Community', 'Township'],
  dock: ['Dock', 'Harbor', 'Port', 'Wharf', 'Marina'],
  cemetery: ['Cemetery', 'Graveyard', 'Necropolis', 'Burial Ground', 'Tomb'],
  manor: ['Manor', 'Estate', 'Mansion', 'Villa', 'Hall'],
  shrine: ['Shrine', 'Chapel', 'Altar', 'Sanctum', 'Grove'],
  outpost: ['Outpost', 'Station', 'Post', 'Garrison', 'Watch'],
  laboratory: ['Laboratory', 'Workshop', 'Study', 'Chamber', 'Sanctum']
};

const ORGANIZATION_DATA = {
  guild: {
    mercantile: {
      good: ['Honest Merchants', 'Fair Trade Company', 'Golden Commerce Guild', 'Righteous Traders', 'Noble Exchange'],
      neutral: ['Merchant\'s Alliance', 'Trade Consortium', 'Commerce Guild', 'Silver Coin Society', 'Market Fellowship'],
      evil: ['Profiteers Union', 'Greedy Merchants', 'Exploiters Guild', 'Corrupt Traders', 'Black Market Cartel']
    },
    crafters: {
      good: ['Artisan\'s Brotherhood', 'Master Craftsmen Guild', 'Honest Workers Union', 'Noble Makers Circle', 'Skilled Hands Society'],
      neutral: ['Craftsmen Alliance', 'Artisan\'s Guild', 'Makers Consortium', 'Trade Masters Circle', 'Workshop Federation'],
      evil: ['Exploitative Crafters', 'Monopolist Guild', 'Sweatshop Masters', 'Corrupt Artisans', 'Greedy Makers']
    },
    thieves: {
      good: ['Robin Hood\'s Band', 'Righteous Rebels', 'Freedom Fighters', 'Justice Seekers', 'Liberation Front'],
      neutral: ['Shadow Guild', 'Silent Brotherhood', 'Nighttime Society', 'Stealth Alliance', 'Rogue\'s Circle'],
      evil: ['Cutthroat Guild', 'Criminal Syndicate', 'Murder Society', 'Assassin\'s Brotherhood', 'Dark Hand Cartel']
    }
  },
  order: {
    religious: {
      good: ['Divine Light Order', 'Sacred Healers', 'Blessed Guardians', 'Holy Protectors', 'Righteous Servants'],
      neutral: ['Balance Keepers', 'Natural Order', 'Harmony Seekers', 'Neutral Priests', 'Equilibrium Circle'],
      evil: ['Dark Cult', 'Shadow Priests', 'Corrupt Clerics', 'Evil Devotees', 'Malevolent Order']
    },
    military: {
      good: ['Knight Protectors', 'Honorable Guards', 'Noble Defenders', 'Righteous Army', 'Holy Warriors'],
      neutral: ['Professional Soldiers', 'Mercenary Company', 'War Veterans', 'Battle-tested Legion', 'Tactical Force'],
      evil: ['Brutal Conquerors', 'Merciless Legion', 'Tyrannical Army', 'Oppressive Force', 'Ruthless Regiment']
    },
    magical: {
      good: ['Wise Wizards Circle', 'Benevolent Mages', 'Healing Magic Guild', 'Protective Enchanters', 'Good Spell Society'],
      neutral: ['Arcane Academy', 'Magic Users Guild', 'Spell Research Society', 'Mystic Circle', 'Wizard\'s Alliance'],
      evil: ['Dark Sorcerers', 'Malevolent Wizards', 'Corrupt Mages', 'Evil Enchanters', 'Necromancer\'s Cabal']
    }
  },
  company: {
    exploration: {
      good: ['Brave Explorers', 'Noble Adventurers', 'Heroic Scouts', 'Righteous Pathfinders', 'Honor-bound Rangers'],
      neutral: ['Professional Explorers', 'Map Makers Guild', 'Frontier Company', 'Scout\'s Alliance', 'Pathfinder Society'],
      evil: ['Ruthless Conquerors', 'Exploitative Scouts', 'Greedy Explorers', 'Territory Grabbers', 'Colonizer Company']
    },
    mercenary: {
      good: ['Honorable Sellswords', 'Noble Mercenaries', 'Righteous Fighters', 'Ethical Warriors', 'Just Soldiers'],
      neutral: ['Professional Mercenaries', 'Battle Company', 'War Contractors', 'Fighting Guild', 'Sword-for-hire'],
      evil: ['Bloodthirsty Killers', 'Merciless Soldiers', 'Brutal Mercenaries', 'Savage Company', 'Cutthroat Warriors']
    }
  }
};

const SYLLABLE_POOLS = {
  fantasy: {
    beginnings: ['Al', 'Ar', 'El', 'Th', 'Ga', 'Ka', 'Mor', 'Dor', 'Len', 'Val', 'Sar', 'Bel', 'Cel', 'Fel'],
    middles: ['an', 'ar', 'en', 'er', 'in', 'ir', 'on', 'or', 'ian', 'iel', 'ren', 'din', 'dor', 'gar'],
    endings: ['ion', 'oth', 'eth', 'ael', 'iel', 'wyn', 'dor', 'mor', 'thos', 'gar', 'del', 'rin', 'las', 'dar']
  },
  ancient: {
    beginnings: ['Aeg', 'Ark', 'Bal', 'Ced', 'Drak', 'Eth', 'Grim', 'Kor', 'Mal', 'Nyx', 'Oth', 'Vel'],
    middles: ['ar', 'ur', 'al', 'el', 'an', 'en', 'oth', 'ith', 'aen', 'aer', 'ael', 'iel'],
    endings: ['os', 'us', 'um', 'is', 'ys', 'ax', 'ex', 'ix', 'oth', 'eth', 'ath']
  }
};

const GENERIC_ADJECTIVES = ['Golden', 'Silver', 'Ancient', 'Mystic', 'Royal', 'Hidden', 'Sacred', 'Lost',
  'Enchanted', 'Forgotten', 'Emerald', 'Crystal', 'Shadow', 'Crimson', 'Azure',
  'Twilight', 'Dawn', 'Storm', 'Frost', 'Fire', 'Wind', 'Stone', 'Iron',
  'Ethereal', 'Celestial', 'Arcane', 'Divine', 'Eternal', 'Radiant', 'Spectral'];

const GENERIC_NOUNS = ['Haven', 'Lodge', 'Keep', 'Hall', 'Sanctuary', 'Chamber', 'Grove', 'Rest', 'Refuge',
  'Realm', 'Domain', 'Expanse', 'Sphere', 'Plane', 'Dimension', 'Nexus', 'Core',
  'Heart', 'Soul', 'Spirit', 'Essence', 'Force', 'Power', 'Energy', 'Aura',
  'Blade', 'Shield', 'Crown', 'Throne', 'Scepter', 'Orb', 'Gem', 'Crystal'];

const ORGANIZATION_PREFIXES = ['The', 'Order of the', 'Brotherhood of', 'Company of', 'Guild of the',
  'Circle of', 'Alliance of', 'Society of the', 'League of', 'Covenant of the'];

const ALIGNMENT_ADJECTIVES = {
  good: ['Noble', 'Righteous', 'Holy', 'Sacred', 'Divine', 'Blessed', 'Pure', 'Honorable', 'Just', 'Benevolent'],
  neutral: ['Silver', 'Golden', 'Crystal', 'Ancient', 'Mystic', 'Arcane', 'Eternal', 'Infinite', 'Radiant', 'Elite'],
  evil: ['Dark', 'Shadow', 'Corrupt', 'Malevolent', 'Sinister', 'Vile', 'Wicked', 'Cruel', 'Ruthless', 'Nefarious']
};

const ORGANIZATION_NOUNS = ['Order', 'Company', 'Guild', 'Brotherhood', 'Circle', 'Alliance', 'Society',
  'League', 'Covenant', 'Council', 'Assembly', 'Union', 'Fellowship', 'Consortium',
  'Syndicate', 'Collective', 'Conclave', 'Chamber', 'House', 'Clan'];

const TERRAIN_DESCRIPTIONS = {
  forest: [
    'Ancient woods where sunlight filters through a verdant canopy and moss-covered stones hide old secrets.',
    'Whispering forests of towering trees, where paths wind between ancient trunks and shadows dance.',
    'Verdant woodlands teeming with life, dappled sunlight playing through leaves above winding trails.',
    'Mysterious forest realm where trees stand like silent sentinels guarding forgotten mysteries.'
  ],
  volcanic: [
    'A landscape shaped by fire and molten rock, where steaming vents and rivers of glowing lava carve the earth.',
    'Smoldering crater where ash-covered slopes rise toward peaks wreathed in sulfurous smoke.',
    'Scorched terrain where lava flows have cooled into twisted formations and geysers shoot steam skyward.',
    'Blazing volcanic field where the earth burns with inner fire and molten streams light the night.'
  ],
  coastal: [
    'Where land meets sea in a dance of tide and stone, rocky shores echo with the crash of endless waves.',
    'Windswept cliffs where seabirds nest and salt spray has weathered the rocks for countless ages.',
    'Peaceful coves where sandy beaches meet clear water and fishing boats bob in sheltered harbors.',
    'Jagged coastline where storm-battered headlands stand defiant against the ocean\'s eternal assault.'
  ],
  badlands: [
    'A harsh expanse of cracked earth and twisted rock formations, where only the hardiest life survives.',
    'Desolate wasteland of eroded canyons and barren mesas, where the wind howls through bone-dry ravines.',
    'Broken terrain of scarred stone and dust-filled gorges, where ancient bones lie bleached by the sun.',
    'Forsaken badlands where the earth has cracked and split, leaving a maze of treacherous passages.'
  ],
  urban: [
    'A bustling cityscape of winding streets and towering buildings, where merchants hawk their wares and crowds flow like rivers.',
    'Cobblestone streets wind between ancient buildings, where the sounds of city life echo off weathered stone walls.',
    'A metropolitan district where noble estates stand alongside merchant quarters, connected by busy boulevards.',
    'Urban sprawl where markets, guildhalls, and residences create a maze of opportunity and intrigue.'
  ],
  industrial: [
    'A mechanized landscape of steam-powered machinery and clanking gears, where smoke rises from countless forges.',
    'Factory districts where the rhythm of production never stops, steam hisses from pipes, and workers toil among the machinery.',
    'Industrial complexes where furnaces roar and workshops buzz with activity, the air thick with the smell of metal and oil.',
    'Manufacturing zones where innovation meets tradition, gears turn endlessly, and the future is forged in fire and steel.'
  ],
  indoor: [
    'Elegant interior spaces with polished floors and decorated walls, where comfort and luxury create an atmosphere of refinement.',
    'Candlelit chambers with rich furnishings and warm fireplaces, offering shelter from the dangers of the outside world.',
    'Private halls adorned with tapestries and art, where intimate conversations and important meetings take place.',
    'Enclosed sanctuaries of learning and comfort, where books line the walls and soft lighting invites contemplation.'
  ]
};

const SETTING_DESCRIPTIONS = {
  tavern: 'A cozy gathering place with warm lighting and the smell of hearty food.',
  village: 'A peaceful settlement with winding paths and friendly faces.',
  fortress: 'An imposing structure of stone and iron, built to withstand siege and assault.',
  temple: 'A sacred place of worship and contemplation, where the faithful gather.',
  dungeon: 'A dark labyrinth of passages and chambers, hiding dangers and treasures alike.',
  castle: 'A grand residence of nobility, with high walls and impressive architecture.',
  tower: 'A tall structure reaching toward the sky, offering views of the surrounding lands.',
  library: 'A quiet repository of knowledge, where scrolls and tomes line the shelves.'
};

module.exports = {
  RACE_NAMES,
  TERRAIN_ELEMENTS,
  PLACE_TYPES,
  ORGANIZATION_DATA,
  SYLLABLE_POOLS,
  GENERIC_ADJECTIVES,
  GENERIC_NOUNS,
  ORGANIZATION_PREFIXES,
  ALIGNMENT_ADJECTIVES,
  ORGANIZATION_NOUNS,
  TERRAIN_DESCRIPTIONS,
  SETTING_DESCRIPTIONS
};