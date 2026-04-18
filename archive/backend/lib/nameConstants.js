/**
 * @file lib/nameConstants.js
 * @description Contains constants for names, adjectives, and nouns.
 * This module is universal and can be used in Node.js and browser environments.
 */

const RACE_NAMES = {
  human: {
    male: [
      'Aldric',
      'Gareth',
      'Marcus',
      'Cedric',
      'Magnus',
      'Roland',
      'Darian',
      'Victor',
      'Adrian',
      'Cassius',
      'Baldwin',
      'Conrad',
      'Edmund',
      'Frederick',
      'Geoffrey',
      'Henry',
      'Jasper',
      'Leopold',
      'Nicholas',
      'Oliver',
      'Patrick',
      'Quinton',
      'Richard',
      'Sebastian',
      'Theodore',
      'Ulrich',
      'Vincent',
      'William',
      'Xavier',
      'Zachary'
    ],
    female: [
      'Lyra',
      'Sera',
      'Elena',
      'Aria',
      'Vera',
      'Isabella',
      'Celeste',
      'Miranda',
      'Valeria',
      'Ophelia',
      'Anastasia',
      'Beatrice',
      'Catherine',
      'Diana',
      'Evangeline',
      'Francesca',
      'Genevieve',
      'Helena',
      'Isadora',
      'Josephine',
      'Katherine',
      'Lillian',
      'Magdalena',
      'Natasha',
      'Octavia',
      'Penelope',
      'Rosalind',
      'Seraphina',
      'Theodora',
      'Victoria'
    ],
    neutral: [
      'Sage',
      'River',
      'Jordan',
      'Phoenix',
      'Vale',
      'Quinn',
      'Rowan',
      'Blair',
      'Ember',
      'Alex',
      'Avery',
      'Cameron',
      'Dakota',
      'Ellis',
      'Finley',
      'Gray',
      'Harper',
      'Indigo',
      'Jules',
      'Kai',
      'Lane',
      'Morgan',
      'Nova',
      'Ocean',
      'Parker',
      'Rebel',
      'Storm',
      'True',
      'Vale',
      'Wren'
    ],
    surnames: [
      'Blackstone',
      'Ironhold',
      'Goldleaf',
      'Brightblade',
      'Stormwind',
      'Redmane',
      'Whitehawk',
      'Ashford',
      'Thornfield',
      'Ravenwood',
      'Aldermore',
      'Barrington',
      'Cromwell',
      'Dunmore',
      'Eastwood',
      'Fairfax',
      'Greyson',
      'Hawthorn',
      'Lancaster',
      'Montague',
      'Northridge',
      'Pemberton',
      'Rothwell',
      'Silverton',
      'Westbrook',
      'Kingsley',
      'Blackwood',
      'Redfield',
      'Goldwin',
      'Steelhart'
    ]
  },
  elf: {
    male: [
      'Aelindra',
      'Silvyr',
      'Thalion',
      'Erevan',
      'Galinndan',
      'Mindartis',
      'Quarion',
      'Riardon',
      'Rolen',
      'Suhnaal'
    ],
    female: [
      'Adrie',
      'Caelynn',
      'Dara',
      'Enna',
      'Galinndan',
      'Halimath',
      'Lamlis',
      'Mindartis',
      'Nutae',
      'Paelynn'
    ],
    neutral: [
      'Aramil',
      'Berrian',
      'Dayereth',
      'Enna',
      'Galinndan',
      'Halimath',
      'Heian',
      'Himo',
      'Immeral',
      'Ivellios'
    ],
    surnames: [
      'Amakir',
      'Amakus',
      'Galanodel',
      'Holimion',
      'Liadon',
      'Meliamne',
      'Nailo',
      'Siannodel',
      'Xiloscient',
      'Alderleaf'
    ]
  },
  dwarf: {
    male: [
      'Adrik',
      'Baern',
      'Darrak',
      'Eberk',
      'Fargrim',
      'Gardain',
      'Harbek',
      'Kildrak',
      'Morgran',
      'Thorek'
    ],
    female: [
      'Amber',
      'Bardryn',
      'Diesa',
      'Eldeth',
      'Gunnloda',
      'Helja',
      'Kathra',
      'Kristryd',
      'Mardred',
      'Riswynn'
    ],
    neutral: [
      'Adrik',
      'Baern',
      'Darrak',
      'Diesa',
      'Eldeth',
      'Fargrim',
      'Gunnloda',
      'Harbek',
      'Kathra',
      'Morgran'
    ],
    surnames: [
      'Battlehammer',
      'Brawnanvil',
      'Dankil',
      'Fireforge',
      'Frostbeard',
      'Gorunn',
      'Holderhek',
      'Ironfist',
      'Loderr',
      'Lutgehr'
    ]
  },
  halfling: {
    male: [
      'Alton',
      'Ander',
      'Bernie',
      'Bobbin',
      'Cade',
      'Callus',
      'Corrin',
      'Dannad',
      'Garret',
      'Lindal'
    ],
    female: [
      'Andry',
      'Bree',
      'Callie',
      'Cora',
      'Euphemia',
      'Jillian',
      'Kithri',
      'Lavinia',
      'Lidda',
      'Merla'
    ],
    neutral: [
      'Alton',
      'Andry',
      'Bernie',
      'Bree',
      'Cade',
      'Callie',
      'Corrin',
      'Garret',
      'Jillian',
      'Lindal'
    ],
    surnames: [
      'Brushgather',
      'Goodbarrel',
      'Greenbottle',
      'High-hill',
      'Hilltopple',
      'Leagallow',
      'Tealeaf',
      'Thorngage',
      'Tosscobble',
      'Underbough'
    ]
  },
  dragonborn: {
    male: [
      'Arjhan',
      'Balasar',
      'Bharash',
      'Donaar',
      'Ghesh',
      'Heskan',
      'Kriv',
      'Medrash',
      'Nadarr',
      'Pandjed'
    ],
    female: [
      'Akra',
      'Biri',
      'Daar',
      'Farideh',
      'Harann',
      'Kava',
      'Korinn',
      'Mishann',
      'Nala',
      'Perra'
    ],
    neutral: [
      'Arjhan',
      'Akra',
      'Bharash',
      'Biri',
      'Donaar',
      'Farideh',
      'Ghesh',
      'Harann',
      'Kriv',
      'Mishann'
    ],
    surnames: [
      'Clethtinthiallor',
      'Daardendrian',
      'Delmirev',
      'Drachedandion',
      'Fenkenkabradon',
      'Kepeshkmolik',
      'Kerrhylon',
      'Kimbatuul',
      'Linxakasendalor',
      'Myastan'
    ]
  },
  gnome: {
    male: [
      'Alston',
      'Alvyn',
      'Boddynock',
      'Brocc',
      'Burgell',
      'Dimble',
      'Eldon',
      'Erky',
      'Fonkin',
      'Frug'
    ],
    female: [
      'Bimpnottin',
      'Breena',
      'Caramip',
      'Carlin',
      'Donella',
      'Duvamil',
      'Ella',
      'Ellyjoybell',
      'Ellywick',
      'Lilli'
    ],
    neutral: [
      'Alston',
      'Bimpnottin',
      'Boddynock',
      'Breena',
      'Burgell',
      'Caramip',
      'Dimble',
      'Donella',
      'Eldon',
      'Ella'
    ],
    surnames: [
      'Beren',
      'Daergel',
      'Folkor',
      'Garrick',
      'Nackle',
      'Murnig',
      'Ningel',
      'Raulnor',
      'Scheppen',
      'Timbers'
    ]
  },
  tiefling: {
    male: [
      'Akmenos',
      'Amnon',
      'Barakas',
      'Damakos',
      'Ekemon',
      'Iados',
      'Kairon',
      'Leucis',
      'Melech',
      'Mordai'
    ],
    female: [
      'Akta',
      'Anakir',
      'Bryseis',
      'Criella',
      'Damaia',
      'Ea',
      'Kallista',
      'Lerissa',
      'Makaria',
      'Nemeia'
    ],
    neutral: [
      'Art',
      'Carrion',
      'Chant',
      'Creed',
      'Despair',
      'Excellence',
      'Fear',
      'Glory',
      'Hope',
      'Ideal'
    ],
    surnames: [
      'Ambition',
      'Carrion',
      'Chant',
      'Creed',
      'Despair',
      'Excellence',
      'Fear',
      'Glory',
      'Hope',
      'Ideal'
    ]
  },
  orc: {
    male: ['Dench', 'Feng', 'Gell', 'Henk', 'Holg', 'Imsh', 'Keth', 'Krusk', 'Mhurren', 'Ront'],
    female: [
      'Baggi',
      'Emen',
      'Engong',
      'Kansif',
      'Myev',
      'Neega',
      'Ovak',
      'Ownka',
      'Shautha',
      'Sutha'
    ],
    neutral: ['Dench', 'Baggi', 'Feng', 'Emen', 'Gell', 'Engong', 'Henk', 'Kansif', 'Holg', 'Myev'],
    surnames: [
      'Bloodfang',
      'Boulderfist',
      'Burnhide',
      'Crackbones',
      'Firerock',
      'Ironskull',
      'Redaxe',
      'Scarbones',
      'Skullsplitter',
      'Warclaw'
    ]
  },
  tabaxi: {
    male: [
      'Cloud on the Mountaintop',
      'Five Timber',
      'Jade Shoe',
      'Left-Handed Hummingbird',
      'Seven Thundercloud',
      'Skirt of Snakes',
      'Smoking Mirror'
    ],
    female: [
      'Autumn in Her Eyes',
      'Dancing Cloud',
      'Ember of Stars',
      'Falling Leaf',
      'Night Whisper',
      'River of Gold',
      'Wind Through Grass'
    ],
    neutral: [
      'Distant Rain',
      'Fire in the Sky',
      'Moon over Water',
      'Shadow of Trees',
      'Song of Birds',
      'Star in Daylight',
      'Thunder Walker'
    ],
    surnames: [
      'Cloudchaser',
      'Nightprowler',
      'Stormcaller',
      'Moonwhisper',
      'Sunstrider',
      'Mistwalker',
      'Stargazer',
      'Windrunner',
      'Shadowtail',
      'Brightclaw'
    ]
  },
  warforged: {
    male: [
      'Blade',
      'Breaker',
      'Cloud',
      'Compass',
      'Crystal',
      'Finder',
      'Fixe',
      'Guide',
      'Honor',
      'Hunter'
    ],
    female: [
      'Baker',
      'Dreamer',
      'Healer',
      'Hope',
      'Idealist',
      'Joy',
      'Lamp',
      'Meter',
      'Muse',
      'Peace'
    ],
    neutral: [
      'Alpha',
      'Banner',
      'Bastion',
      'Bulwark',
      'Chassis',
      'Cipher',
      'Construct',
      'Engine',
      'Forge',
      'Gear',
      'Iron',
      'Logic',
      'Matrix',
      'Node',
      'Onyx',
      'Prism',
      'Quartz',
      'Relic',
      'Steel',
      'Titan'
    ],
    surnames: [
      'd\'Cannith',
      'd\'Deneith',
      'd\'Ghallanda',
      'd\'Jorasco',
      'd\'Kundarak',
      'd\'Lyrandar',
      'd\'Medani',
      'd\'Orien',
      'd\'Phiarlan',
      'd\'Sivis'
    ]
  },
  kobold: {
    male: ['Arix', 'Eks', 'Ett', 'Galax', 'Gax', 'Ixen', 'Jank', 'Krag', 'Kreet', 'Meepo'],
    female: ['Bhek', 'Eek', 'Emi', 'Hix', 'Imx', 'Irxes', 'Kas', 'Krik', 'Nak', 'Pex'],
    neutral: ['Yip', 'Yap', 'Yek', 'Yak', 'Yix', 'Yox', 'Yuk', 'Yek', 'Yip', 'Yop'],
    surnames: [
      'Scaleclipper',
      'Rustgnaw',
      'Flamesnout',
      'Ironjaw',
      'Shieldbreaker',
      'Spearpoint',
      'Trapfinder',
      'Tunneldigger',
      'Warpsnarl',
      'Axebiter'
    ]
  },
  goliath: {
    male: [
      'Aukan',
      'Eglath',
      'Gae-Al',
      'Gauthak',
      'Ilikan',
      'Keothi',
      'Kuori',
      'Lo-Kag',
      'Manneo',
      'Maveith'
    ],
    female: [
      'Akannathi',
      'Eunkathka',
      'Gunnloda',
      'Iekika',
      'Katho-Olavi',
      'Kenkarthka',
      'Liadra',
      'Manakathi',
      'Nalla',
      'Orilo'
    ],
    neutral: [
      'Thuliaga',
      'Thunukalathi',
      'Vaimei-Laga',
      'Vekka',
      'Vimak',
      'Vimarka',
      'Yamnathka',
      'Yolanda',
      'Yugol',
      'Yvonna'
    ],
    surnames: [
      'Anakalathai',
      'Elanithino',
      'Gathakanathi',
      'Kalagiano',
      'Katho-Olavi',
      'Kolae-Gileana',
      'Ogolakanu',
      'Thuliaga',
      'Thunukalathi',
      'Vaimei-Laga'
    ]
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
      good: [
        'Honest Merchants',
        'Fair Trade Company',
        'Golden Commerce Guild',
        'Righteous Traders',
        'Noble Exchange'
      ],
      neutral: [
        'Merchant\'s Alliance',
        'Trade Consortium',
        'Commerce Guild',
        'Silver Coin Society',
        'Market Fellowship'
      ],
      evil: [
        'Profiteers Union',
        'Greedy Merchants',
        'Exploiters Guild',
        'Corrupt Traders',
        'Black Market Cartel'
      ]
    },
    crafters: {
      good: [
        'Artisan\'s Brotherhood',
        'Master Craftsmen Guild',
        'Honest Workers Union',
        'Noble Makers Circle',
        'Skilled Hands Society'
      ],
      neutral: [
        'Craftsmen Alliance',
        'Artisan\'s Guild',
        'Makers Consortium',
        'Trade Masters Circle',
        'Workshop Federation'
      ],
      evil: [
        'Exploitative Crafters',
        'Monopolist Guild',
        'Sweatshop Masters',
        'Corrupt Artisans',
        'Greedy Makers'
      ]
    },
    thieves: {
      good: [
        'Robin Hood\'s Band',
        'Righteous Rebels',
        'Freedom Fighters',
        'Justice Seekers',
        'Liberation Front'
      ],
      neutral: [
        'Shadow Guild',
        'Silent Brotherhood',
        'Nighttime Society',
        'Stealth Alliance',
        'Rogue\'s Circle'
      ],
      evil: [
        'Cutthroat Guild',
        'Criminal Syndicate',
        'Murder Society',
        'Assassin\'s Brotherhood',
        'Dark Hand Cartel'
      ]
    }
  },
  order: {
    religious: {
      good: [
        'Divine Light Order',
        'Sacred Healers',
        'Blessed Guardians',
        'Holy Protectors',
        'Righteous Servants'
      ],
      neutral: [
        'Balance Keepers',
        'Natural Order',
        'Harmony Seekers',
        'Neutral Priests',
        'Equilibrium Circle'
      ],
      evil: ['Dark Cult', 'Shadow Priests', 'Corrupt Clerics', 'Evil Devotees', 'Malevolent Order']
    },
    military: {
      good: [
        'Knight Protectors',
        'Honorable Guards',
        'Noble Defenders',
        'Righteous Army',
        'Holy Warriors'
      ],
      neutral: [
        'Professional Soldiers',
        'Mercenary Company',
        'War Veterans',
        'Battle-tested Legion',
        'Tactical Force'
      ],
      evil: [
        'Brutal Conquerors',
        'Merciless Legion',
        'Tyrannical Army',
        'Oppressive Force',
        'Ruthless Regiment'
      ]
    },
    magical: {
      good: [
        'Wise Wizards Circle',
        'Benevolent Mages',
        'Healing Magic Guild',
        'Protective Enchanters',
        'Good Spell Society'
      ],
      neutral: [
        'Arcane Academy',
        'Magic Users Guild',
        'Spell Research Society',
        'Mystic Circle',
        'Wizard\'s Alliance'
      ],
      evil: [
        'Dark Sorcerers',
        'Malevolent Wizards',
        'Corrupt Mages',
        'Evil Enchanters',
        'Necromancer\'s Cabal'
      ]
    }
  },
  company: {
    exploration: {
      good: [
        'Brave Explorers',
        'Noble Adventurers',
        'Heroic Scouts',
        'Righteous Pathfinders',
        'Honor-bound Rangers'
      ],
      neutral: [
        'Professional Explorers',
        'Map Makers Guild',
        'Frontier Company',
        'Scout\'s Alliance',
        'Pathfinder Society'
      ],
      evil: [
        'Ruthless Conquerors',
        'Exploitative Scouts',
        'Greedy Explorers',
        'Territory Grabbers',
        'Colonizer Company'
      ]
    },
    mercenary: {
      good: [
        'Honorable Sellswords',
        'Noble Mercenaries',
        'Righteous Fighters',
        'Ethical Warriors',
        'Just Soldiers'
      ],
      neutral: [
        'Professional Mercenaries',
        'Battle Company',
        'War Contractors',
        'Fighting Guild',
        'Sword-for-hire'
      ],
      evil: [
        'Bloodthirsty Killers',
        'Merciless Soldiers',
        'Brutal Mercenaries',
        'Savage Company',
        'Cutthroat Warriors'
      ]
    }
  }
};

const SYLLABLE_POOLS = {
  fantasy: {
    beginnings: [
      'Al',
      'Ar',
      'El',
      'Th',
      'Ga',
      'Ka',
      'Mor',
      'Dor',
      'Len',
      'Val',
      'Sar',
      'Bel',
      'Cel',
      'Fel'
    ],
    middles: [
      'an',
      'ar',
      'en',
      'er',
      'in',
      'ir',
      'on',
      'or',
      'ian',
      'iel',
      'ren',
      'din',
      'dor',
      'gar'
    ],
    endings: [
      'ion',
      'oth',
      'eth',
      'ael',
      'iel',
      'wyn',
      'dor',
      'mor',
      'thos',
      'gar',
      'del',
      'rin',
      'las',
      'dar'
    ]
  },
  ancient: {
    beginnings: [
      'Aeg',
      'Ark',
      'Bal',
      'Ced',
      'Drak',
      'Eth',
      'Grim',
      'Kor',
      'Mal',
      'Nyx',
      'Oth',
      'Vel'
    ],
    middles: ['ar', 'ur', 'al', 'el', 'an', 'en', 'oth', 'ith', 'aen', 'aer', 'ael', 'iel'],
    endings: ['os', 'us', 'um', 'is', 'ys', 'ax', 'ex', 'ix', 'oth', 'eth', 'ath']
  }
};

const GENERIC_ADJECTIVES = [
  'Golden',
  'Silver',
  'Ancient',
  'Mystic',
  'Royal',
  'Hidden',
  'Sacred',
  'Lost',
  'Enchanted',
  'Forgotten',
  'Emerald',
  'Crystal',
  'Shadow',
  'Crimson',
  'Azure',
  'Twilight',
  'Dawn',
  'Storm',
  'Frost',
  'Fire',
  'Wind',
  'Stone',
  'Iron',
  'Ethereal',
  'Celestial',
  'Arcane',
  'Divine',
  'Eternal',
  'Radiant',
  'Spectral'
];

const GENERIC_NOUNS = [
  'Haven',
  'Lodge',
  'Keep',
  'Hall',
  'Sanctuary',
  'Chamber',
  'Grove',
  'Rest',
  'Refuge',
  'Realm',
  'Domain',
  'Expanse',
  'Sphere',
  'Plane',
  'Dimension',
  'Nexus',
  'Core',
  'Heart',
  'Soul',
  'Spirit',
  'Essence',
  'Force',
  'Power',
  'Energy',
  'Aura',
  'Blade',
  'Shield',
  'Crown',
  'Throne',
  'Scepter',
  'Orb',
  'Gem',
  'Crystal'
];

const ORGANIZATION_PREFIXES = [
  'The',
  'Order of the',
  'Brotherhood of',
  'Company of',
  'Guild of the',
  'Circle of',
  'Alliance of',
  'Society of the',
  'League of',
  'Covenant of the'
];

const ALIGNMENT_ADJECTIVES = {
  good: [
    'Noble',
    'Righteous',
    'Holy',
    'Sacred',
    'Divine',
    'Blessed',
    'Pure',
    'Honorable',
    'Just',
    'Benevolent'
  ],
  neutral: [
    'Silver',
    'Golden',
    'Crystal',
    'Ancient',
    'Mystic',
    'Arcane',
    'Eternal',
    'Infinite',
    'Radiant',
    'Elite'
  ],
  evil: [
    'Dark',
    'Shadow',
    'Corrupt',
    'Malevolent',
    'Sinister',
    'Vile',
    'Wicked',
    'Cruel',
    'Ruthless',
    'Nefarious'
  ]
};

const ORGANIZATION_NOUNS = [
  'Order',
  'Company',
  'Guild',
  'Brotherhood',
  'Circle',
  'Alliance',
  'Society',
  'League',
  'Covenant',
  'Council',
  'Assembly',
  'Union',
  'Fellowship',
  'Consortium',
  'Syndicate',
  'Collective',
  'Conclave',
  'Chamber',
  'House',
  'Clan'
];

module.exports = {
  RACE_NAMES,
  PLACE_TYPES,
  ORGANIZATION_DATA,
  SYLLABLE_POOLS,
  GENERIC_ADJECTIVES,
  GENERIC_NOUNS,
  ORGANIZATION_PREFIXES,
  ALIGNMENT_ADJECTIVES,
  ORGANIZATION_NOUNS
};
