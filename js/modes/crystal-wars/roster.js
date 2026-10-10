/* Shared competitive roster: campaign identity/art with normalized arena kits and ten bounded specialties.
 * Equipment, campaign levels and founder powers never alter base profiles.
 * Signatures are arena adaptations with explicit tradeoffs, not original campaign passives. */
(function(root){'use strict';
const SIGNATURES={
  "bulwark": {
    "name": "Custodia",
    "desc": "Tus escudos absorben un 15% más. Mientras tienes escudo te mueves un 8% más lento."
  },
  "execution": {
    "name": "Remate",
    "desc": "Tus ataques básicos infligen un 18% más a objetivos por debajo del 35% de vida y un 8% menos a los demás."
  },
  "focus": {
    "name": "Distancia",
    "desc": "Tus ataques básicos infligen un 12% más más allá del 60% de tu alcance y un 12% menos de cerca."
  },
  "siphon": {
    "name": "Sustento",
    "desc": "Tus ataques básicos infligen un 10% menos y recuperan un 8% del daño efectivo causado."
  },
  "tempo": {
    "name": "Cadencia",
    "desc": "Cada tercer ataque básico inflige un 30% más; los otros dos infligen un 15% menos."
  },
  "frost": {
    "name": "Contención",
    "desc": "Tus ataques básicos infligen un 10% menos y ralentizan un 30% durante 0,45 segundos."
  },
  "momentum": {
    "name": "Impulso",
    "desc": "Tus ataques básicos infligen un 10% más mientras te mueves y un 10% menos estando quieto."
  },
  "renewal": {
    "name": "Restauración",
    "desc": "Tus curaciones restauran un 20% más; tus ataques básicos infligen un 12% menos."
  },
  "aftermath": {
    "name": "Concentración",
    "desc": "Tu zona persistente inflige un 25% más por pulso, pero dura 4 segundos en vez de 5."
  },
  "surge": {
    "name": "Descarga",
    "desc": "Tu definitiva inflige un 15% más, pero su recarga aumenta de 32 a 37 segundos."
  }
};
const ROLES={
  "tanque": {
    "hp": 240,
    "speed": 150,
    "damage": 44,
    "range": 90,
    "rate": 0.55,
    "skills": [
      "Barrido del Bastión",
      "Paso del Bastión",
      "Baluarte del Bastión",
      "Ruptura del Bastión"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran golpe circular con escudo personal."
    ],
    "id": "tanque",
    "archetype": "tanque",
    "name": "Aldric",
    "title": "el Último Bastión",
    "color": "#5f8fc4",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "bulwark",
    "passive": {
      "name": "Juramento del Bastión",
      "desc": "Tus escudos absorben un 15% más. Mientras tienes escudo te mueves un 8% más lento."
    }
  },
  "guerrero": {
    "hp": 155,
    "speed": 195,
    "damage": 29,
    "range": 100,
    "rate": 0.48,
    "skills": [
      "Corte de Sombras",
      "Paso de Sombras",
      "Campo de Sombras",
      "Ruptura de Sombras"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran golpe circular y ralentización."
    ],
    "id": "guerrero",
    "archetype": "guerrero",
    "name": "Kael",
    "title": "la Daga Carmesí",
    "color": "#c4544a",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "execution",
    "passive": {
      "name": "Filo Oportunista",
      "desc": "Tus ataques básicos infligen un 18% más a objetivos por debajo del 35% de vida y un 8% menos a los demás."
    }
  },
  "mago": {
    "hp": 125,
    "speed": 165,
    "damage": 21,
    "range": 290,
    "rate": 0.65,
    "skills": [
      "Pulso Elemental",
      "Paso Elemental",
      "Campo Elemental",
      "Cataclismo Elemental"
    ],
    "skillDescriptions": [
      "Explosión circular que ralentiza.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran explosión circular y ralentización."
    ],
    "id": "mago",
    "archetype": "mago",
    "name": "Thalen",
    "title": "el Tejedor Elemental",
    "color": "#a15fc7",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "aftermath",
    "passive": {
      "name": "Convergencia Elemental",
      "desc": "Tu zona persistente inflige un 25% más por pulso, pero dura 4 segundos en vez de 5."
    }
  },
  "soporte": {
    "hp": 165,
    "speed": 170,
    "damage": 22,
    "range": 260,
    "rate": 0.5,
    "skills": [
      "Pulso del Alba",
      "Paso del Alba",
      "Baluarte del Alba",
      "Santuario del Alba"
    ],
    "skillDescriptions": [
      "Pulso de daño y curación cercana.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran pulso de daño y curación aliada."
    ],
    "id": "soporte",
    "archetype": "soporte",
    "name": "Elyra",
    "title": "la Guardiana del Alba",
    "color": "#5fc48c",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "renewal",
    "passive": {
      "name": "Gracia del Alba",
      "desc": "Tus curaciones restauran un 20% más; tus ataques básicos infligen un 12% menos."
    }
  },
  "segador": {
    "hp": 240,
    "speed": 150,
    "damage": 44,
    "range": 90,
    "rate": 0.55,
    "skills": [
      "Barrido del Olvido",
      "Paso del Olvido",
      "Baluarte del Olvido",
      "Ruptura del Olvido"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran golpe circular con escudo personal."
    ],
    "id": "segador",
    "archetype": "tanque",
    "name": "Segador",
    "title": "el Olvidado",
    "color": "#c62828",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "siphon",
    "passive": {
      "name": "Siega Vital",
      "desc": "Tus ataques básicos infligen un 10% menos y recuperan un 8% del daño efectivo causado."
    }
  },
  "axiom": {
    "hp": 125,
    "speed": 165,
    "damage": 21,
    "range": 290,
    "rate": 0.65,
    "skills": [
      "Pulso del Código",
      "Paso del Código",
      "Campo del Código",
      "Cataclismo del Código"
    ],
    "skillDescriptions": [
      "Explosión circular que ralentiza.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran explosión circular y ralentización."
    ],
    "id": "axiom",
    "archetype": "mago",
    "name": "Axiom",
    "title": "el Reescritor",
    "color": "#3ad6c4",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "aftermath",
    "passive": {
      "name": "Código Residual",
      "desc": "Tu zona persistente inflige un 25% más por pulso, pero dura 4 segundos en vez de 5."
    }
  },
  "profeta": {
    "hp": 165,
    "speed": 170,
    "damage": 22,
    "range": 260,
    "rate": 0.5,
    "skills": [
      "Pulso del Augurio",
      "Paso del Augurio",
      "Baluarte del Augurio",
      "Santuario del Augurio"
    ],
    "skillDescriptions": [
      "Pulso de daño y curación cercana.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran pulso de daño y curación aliada."
    ],
    "id": "profeta",
    "archetype": "soporte",
    "name": "Ismara",
    "title": "la Profeta Ciega",
    "color": "#4fd8c4",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "tempo",
    "passive": {
      "name": "Tercer Presagio",
      "desc": "Cada tercer ataque básico inflige un 30% más; los otros dos infligen un 15% menos."
    }
  },
  "musashi": {
    "hp": 155,
    "speed": 195,
    "damage": 29,
    "range": 100,
    "rate": 0.48,
    "skills": [
      "Corte del Rōnin",
      "Paso del Rōnin",
      "Campo del Rōnin",
      "Ruptura del Rōnin"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran golpe circular y ralentización."
    ],
    "id": "musashi",
    "archetype": "guerrero",
    "name": "Musashi",
    "title": "el Rōnin del Bokken",
    "color": "#5aa8d8",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "execution",
    "passive": {
      "name": "Lectura del Rival",
      "desc": "Tus ataques básicos infligen un 18% más a objetivos por debajo del 35% de vida y un 8% menos a los demás."
    }
  },
  "cazadora": {
    "hp": 155,
    "speed": 195,
    "damage": 29,
    "range": 100,
    "rate": 0.48,
    "skills": [
      "Corte de la Cacería",
      "Paso de la Cacería",
      "Campo de la Cacería",
      "Ruptura de la Cacería"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran golpe circular y ralentización."
    ],
    "id": "cazadora",
    "archetype": "guerrero",
    "name": "Sylva",
    "title": "la Cazadora del Bosque",
    "color": "#5c9a4a",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "momentum",
    "passive": {
      "name": "Paso de Cazadora",
      "desc": "Tus ataques básicos infligen un 10% más mientras te mueves y un 10% menos estando quieto."
    }
  },
  "nigromante": {
    "hp": 125,
    "speed": 165,
    "damage": 21,
    "range": 290,
    "rate": 0.65,
    "skills": [
      "Pulso de las Almas",
      "Paso de las Almas",
      "Campo de las Almas",
      "Cataclismo de las Almas"
    ],
    "skillDescriptions": [
      "Explosión circular que ralentiza.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran explosión circular y ralentización."
    ],
    "id": "nigromante",
    "archetype": "mago",
    "name": "Ilvar",
    "title": "el Señor de las Criptas",
    "color": "#4ab88a",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "siphon",
    "passive": {
      "name": "Diezmo de Almas",
      "desc": "Tus ataques básicos infligen un 10% menos y recuperan un 8% del daño efectivo causado."
    }
  },
  "libertador": {
    "hp": 155,
    "speed": 195,
    "damage": 29,
    "range": 100,
    "rate": 0.48,
    "skills": [
      "Corte de la Libertad",
      "Paso de la Libertad",
      "Campo de la Libertad",
      "Ruptura de la Libertad"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran golpe circular y ralentización."
    ],
    "id": "libertador",
    "archetype": "guerrero",
    "name": "San Martín",
    "title": "el Libertador",
    "color": "#2f4f9a",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "momentum",
    "passive": {
      "name": "Avance Libertador",
      "desc": "Tus ataques básicos infligen un 10% más mientras te mueves y un 10% menos estando quieto."
    }
  },
  "eren": {
    "hp": 155,
    "speed": 195,
    "damage": 29,
    "range": 100,
    "rate": 0.48,
    "skills": [
      "Corte del Avance",
      "Paso del Avance",
      "Campo del Avance",
      "Ruptura del Avance"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran golpe circular y ralentización."
    ],
    "id": "eren",
    "archetype": "guerrero",
    "name": "Eren",
    "title": "el Indómito",
    "color": "#7a3b2e",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "momentum",
    "passive": {
      "name": "Impulso Imparable",
      "desc": "Tus ataques básicos infligen un 10% más mientras te mueves y un 10% menos estando quieto."
    }
  },
  "ynara": {
    "hp": 165,
    "speed": 170,
    "damage": 22,
    "range": 260,
    "rate": 0.5,
    "skills": [
      "Pulso de la Paciencia",
      "Paso de la Paciencia",
      "Baluarte de la Paciencia",
      "Santuario de la Paciencia"
    ],
    "skillDescriptions": [
      "Pulso de daño y curación cercana.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran pulso de daño y curación aliada."
    ],
    "id": "ynara",
    "archetype": "soporte",
    "name": "Ynara",
    "title": "la Médica de los Refugios",
    "color": "#ed8db5",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "renewal",
    "passive": {
      "name": "Santa Paciencia",
      "desc": "Tus curaciones restauran un 20% más; tus ataques básicos infligen un 12% menos."
    }
  },
  "myla": {
    "hp": 125,
    "speed": 165,
    "damage": 21,
    "range": 290,
    "rate": 0.65,
    "skills": [
      "Pulso de Yogur",
      "Paso de Yogur",
      "Campo de Yogur",
      "Cataclismo de Yogur"
    ],
    "skillDescriptions": [
      "Explosión circular que ralentiza.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran explosión circular y ralentización."
    ],
    "id": "myla",
    "archetype": "mago",
    "name": "Myla",
    "title": "la Niña de la Cuchara",
    "color": "#e99abb",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "frost",
    "passive": {
      "name": "Yogur Pegajoso",
      "desc": "Tus ataques básicos infligen un 10% menos y ralentizan un 30% durante 0,45 segundos."
    }
  },
  "brasa": {
    "hp": 125,
    "speed": 165,
    "damage": 21,
    "range": 290,
    "rate": 0.65,
    "skills": [
      "Pulso de Vapor",
      "Paso de Vapor",
      "Campo de Vapor",
      "Cataclismo de Vapor"
    ],
    "skillDescriptions": [
      "Explosión circular que ralentiza.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran explosión circular y ralentización."
    ],
    "id": "brasa",
    "archetype": "mago",
    "name": "Brasa",
    "title": "la Mecánica Fugitiva",
    "color": "#c58543",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "aftermath",
    "passive": {
      "name": "Presión de Caldera",
      "desc": "Tu zona persistente inflige un 25% más por pulso, pero dura 4 segundos en vez de 5."
    }
  },
  "eslabon": {
    "hp": 240,
    "speed": 150,
    "damage": 44,
    "range": 90,
    "rate": 0.55,
    "skills": [
      "Barrido de Cadenas",
      "Paso de Cadenas",
      "Baluarte de Cadenas",
      "Ruptura de Cadenas"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran golpe circular con escudo personal."
    ],
    "id": "eslabon",
    "archetype": "tanque",
    "name": "Garren",
    "title": "el Eslabón",
    "color": "#9195a1",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "bulwark",
    "passive": {
      "name": "Custodia de Hierro",
      "desc": "Tus escudos absorben un 15% más. Mientras tienes escudo te mueves un 8% más lento."
    }
  },
  "morwen": {
    "hp": 125,
    "speed": 165,
    "damage": 21,
    "range": 290,
    "rate": 0.65,
    "skills": [
      "Pulso de Resina",
      "Paso de Resina",
      "Campo de Resina",
      "Cataclismo de Resina"
    ],
    "skillDescriptions": [
      "Explosión circular que ralentiza.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran explosión circular y ralentización."
    ],
    "id": "morwen",
    "archetype": "mago",
    "name": "Morwen",
    "title": "la Destiladora de Ecos",
    "color": "#a46191",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "frost",
    "passive": {
      "name": "Sal y Resina",
      "desc": "Tus ataques básicos infligen un 10% menos y ralentizan un 30% durante 0,45 segundos."
    }
  },
  "farolero": {
    "hp": 165,
    "speed": 170,
    "damage": 22,
    "range": 260,
    "rate": 0.5,
    "skills": [
      "Pulso de la Lumbre",
      "Paso de la Lumbre",
      "Baluarte de la Lumbre",
      "Santuario de la Lumbre"
    ],
    "skillDescriptions": [
      "Pulso de daño y curación cercana.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran pulso de daño y curación aliada."
    ],
    "id": "farolero",
    "archetype": "soporte",
    "name": "Tobías",
    "title": "el Farolero",
    "color": "#bba56e",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "bulwark",
    "passive": {
      "name": "Lumbre Protectora",
      "desc": "Tus escudos absorben un 15% más. Mientras tienes escudo te mueves un 8% más lento."
    }
  },
  "iria": {
    "hp": 125,
    "speed": 165,
    "damage": 21,
    "range": 290,
    "rate": 0.65,
    "skills": [
      "Pulso del Hilo",
      "Paso del Hilo",
      "Campo del Hilo",
      "Cataclismo del Hilo"
    ],
    "skillDescriptions": [
      "Explosión circular que ralentiza.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran explosión circular y ralentización."
    ],
    "id": "iria",
    "archetype": "mago",
    "name": "Iria",
    "title": "la Tejedora de Límites",
    "color": "#8889c1",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "aftermath",
    "passive": {
      "name": "Tensión del Hilo",
      "desc": "Tu zona persistente inflige un 25% más por pulso, pero dura 4 segundos en vez de 5."
    }
  },
  "vesper": {
    "hp": 155,
    "speed": 195,
    "damage": 29,
    "range": 100,
    "rate": 0.48,
    "skills": [
      "Corte de Sombras",
      "Paso de Sombras",
      "Campo de Sombras",
      "Ruptura de Sombras"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran golpe circular y ralentización."
    ],
    "id": "vesper",
    "archetype": "guerrero",
    "name": "Vesper",
    "title": "la Costurera de Sombras",
    "color": "#aa75bd",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "execution",
    "passive": {
      "name": "Costura Final",
      "desc": "Tus ataques básicos infligen un 18% más a objetivos por debajo del 35% de vida y un 8% menos a los demás."
    }
  },
  "nahir": {
    "hp": 155,
    "speed": 195,
    "damage": 29,
    "range": 100,
    "rate": 0.48,
    "skills": [
      "Corte del Espejo",
      "Paso del Espejo",
      "Campo del Espejo",
      "Ruptura del Espejo"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran golpe circular y ralentización."
    ],
    "id": "nahir",
    "archetype": "guerrero",
    "name": "Nahir",
    "title": "el Restaurador de Espejos",
    "color": "#68c6c2",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "tempo",
    "passive": {
      "name": "Espejo de Tres Golpes",
      "desc": "Cada tercer ataque básico inflige un 30% más; los otros dos infligen un 15% menos."
    }
  },
  "baltra": {
    "hp": 240,
    "speed": 150,
    "damage": 44,
    "range": 90,
    "rate": 0.55,
    "skills": [
      "Barrido de las Profundidades",
      "Paso de las Profundidades",
      "Baluarte de las Profundidades",
      "Ruptura de las Profundidades"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran golpe circular con escudo personal."
    ],
    "id": "baltra",
    "archetype": "tanque",
    "name": "Baltra",
    "title": "la Campana Sumergida",
    "color": "#8bb4bd",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "bulwark",
    "passive": {
      "name": "Escafandra de Juramentos",
      "desc": "Tus escudos absorben un 15% más. Mientras tienes escudo te mueves un 8% más lento."
    }
  },
  "maura": {
    "hp": 240,
    "speed": 150,
    "damage": 44,
    "range": 90,
    "rate": 0.55,
    "skills": [
      "Barrido de Raíces",
      "Paso de Raíces",
      "Baluarte de Raíces",
      "Ruptura de Raíces"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran golpe circular con escudo personal."
    ],
    "id": "maura",
    "archetype": "tanque",
    "name": "Maura",
    "title": "la Pastora de Espinas",
    "color": "#879c60",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "siphon",
    "passive": {
      "name": "Raíz Persistente",
      "desc": "Tus ataques básicos infligen un 10% menos y recuperan un 8% del daño efectivo causado."
    }
  },
  "dariel": {
    "hp": 165,
    "speed": 170,
    "damage": 22,
    "range": 260,
    "rate": 0.5,
    "skills": [
      "Pulso de la Armonía",
      "Paso de la Armonía",
      "Baluarte de la Armonía",
      "Santuario de la Armonía"
    ],
    "skillDescriptions": [
      "Pulso de daño y curación cercana.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran pulso de daño y curación aliada."
    ],
    "id": "dariel",
    "archetype": "soporte",
    "name": "Dáriel",
    "title": "el Último Compás",
    "color": "#d6af77",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "renewal",
    "passive": {
      "name": "Armonía Reparadora",
      "desc": "Tus curaciones restauran un 20% más; tus ataques básicos infligen un 12% menos."
    }
  },
  "orsa": {
    "hp": 155,
    "speed": 195,
    "damage": 29,
    "range": 100,
    "rate": 0.48,
    "skills": [
      "Corte de la Arbalesta",
      "Paso de la Arbalesta",
      "Campo de la Arbalesta",
      "Ruptura de la Arbalesta"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran golpe circular y ralentización."
    ],
    "id": "orsa",
    "archetype": "guerrero",
    "name": "Orsa",
    "title": "la Guardacables",
    "color": "#dfa352",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "tempo",
    "passive": {
      "name": "Ritmo de Arbalesta",
      "desc": "Cada tercer ataque básico inflige un 30% más; los otros dos infligen un 15% menos."
    }
  },
  "tibor": {
    "hp": 125,
    "speed": 165,
    "damage": 21,
    "range": 290,
    "rate": 0.65,
    "skills": [
      "Pulso del Enjambre",
      "Paso del Enjambre",
      "Campo del Enjambre",
      "Cataclismo del Enjambre"
    ],
    "skillDescriptions": [
      "Explosión circular que ralentiza.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran explosión circular y ralentización."
    ],
    "id": "tibor",
    "archetype": "mago",
    "name": "Tibor",
    "title": "el Rey sin Corona",
    "color": "#c9b365",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "frost",
    "passive": {
      "name": "Enjambre Obstinado",
      "desc": "Tus ataques básicos infligen un 10% menos y ralentizan un 30% durante 0,45 segundos."
    }
  },
  "zahra": {
    "hp": 125,
    "speed": 165,
    "damage": 21,
    "range": 290,
    "rate": 0.65,
    "skills": [
      "Pulso de la Caldera",
      "Paso de la Caldera",
      "Campo de la Caldera",
      "Cataclismo de la Caldera"
    ],
    "skillDescriptions": [
      "Explosión circular que ralentiza.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran explosión circular y ralentización."
    ],
    "id": "zahra",
    "archetype": "mago",
    "name": "Zahra",
    "title": "la Mano de la Válvula",
    "color": "#ed8858",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "aftermath",
    "passive": {
      "name": "Vapor Condensado",
      "desc": "Tu zona persistente inflige un 25% más por pulso, pero dura 4 segundos en vez de 5."
    }
  },
  "renko": {
    "hp": 240,
    "speed": 150,
    "damage": 44,
    "range": 90,
    "rate": 0.55,
    "skills": [
      "Barrido de los Nombres",
      "Paso de los Nombres",
      "Baluarte de los Nombres",
      "Ruptura de los Nombres"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran golpe circular con escudo personal."
    ],
    "id": "renko",
    "archetype": "tanque",
    "name": "Renko",
    "title": "el Jardinero de Nombres",
    "color": "#a99a83",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "surge",
    "passive": {
      "name": "Último Nombre",
      "desc": "Tu definitiva inflige un 15% más, pero su recarga aumenta de 32 a 37 segundos."
    }
  },
  "sira": {
    "hp": 125,
    "speed": 165,
    "damage": 21,
    "range": 290,
    "rate": 0.65,
    "skills": [
      "Pulso de la Brújula",
      "Paso de la Brújula",
      "Campo de la Brújula",
      "Cataclismo de la Brújula"
    ],
    "skillDescriptions": [
      "Explosión circular que ralentiza.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran explosión circular y ralentización."
    ],
    "id": "sira",
    "archetype": "mago",
    "name": "Sira",
    "title": "la Cartógrafa del Regreso",
    "color": "#8aa7da",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "focus",
    "passive": {
      "name": "Rumbo Calculado",
      "desc": "Tus ataques básicos infligen un 12% más más allá del 60% de tu alcance y un 12% menos de cerca."
    }
  },
  "nano_gm": {
    "hp": 125,
    "speed": 165,
    "damage": 21,
    "range": 290,
    "rate": 0.65,
    "skills": [
      "Pulso del Umbral",
      "Paso del Umbral",
      "Campo del Umbral",
      "Cataclismo del Umbral"
    ],
    "skillDescriptions": [
      "Explosión circular que ralentiza.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran explosión circular y ralentización."
    ],
    "id": "nano_gm",
    "archetype": "mago",
    "name": "Nano GM",
    "title": "El Regente del Umbral",
    "color": "#e8c56a",
    "ownerOnly": true,
    "founder": "nano",
    "adapted": true,
    "signature": "surge",
    "passive": {
      "name": "Juicio del Umbral",
      "desc": "Tu definitiva inflige un 15% más, pero su recarga aumenta de 32 a 37 segundos."
    }
  },
  "facu_gm": {
    "hp": 155,
    "speed": 195,
    "damage": 29,
    "range": 100,
    "rate": 0.48,
    "skills": [
      "Corte de las Mareas",
      "Paso de las Mareas",
      "Campo de las Mareas",
      "Ruptura de las Mareas"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran golpe circular y ralentización."
    ],
    "id": "facu_gm",
    "archetype": "guerrero",
    "name": "Facu GM",
    "title": "El Soberano de las Mareas",
    "color": "#5aa8e4",
    "ownerOnly": true,
    "founder": "facu",
    "adapted": true,
    "signature": "execution",
    "passive": {
      "name": "Presión Abisal",
      "desc": "Tus ataques básicos infligen un 18% más a objetivos por debajo del 35% de vida y un 8% menos a los demás."
    }
  },
  "aurelia": {
    "hp": 125,
    "speed": 165,
    "damage": 21,
    "range": 290,
    "rate": 0.65,
    "skills": [
      "Pulso Solar",
      "Paso Solar",
      "Campo Solar",
      "Cataclismo Solar"
    ],
    "skillDescriptions": [
      "Explosión circular que ralentiza.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran explosión circular y ralentización."
    ],
    "id": "aurelia",
    "archetype": "mago",
    "name": "Aurelia",
    "title": "La Arquitecta Solar",
    "color": "#f2c14e",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "focus",
    "passive": {
      "name": "Distancia Solar",
      "desc": "Tus ataques básicos infligen un 12% más más allá del 60% de tu alcance y un 12% menos de cerca."
    }
  },
  "khepri": {
    "hp": 155,
    "speed": 195,
    "damage": 29,
    "range": 100,
    "rate": 0.48,
    "skills": [
      "Corte de Quitina",
      "Paso de Quitina",
      "Campo de Quitina",
      "Ruptura de Quitina"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran golpe circular y ralentización."
    ],
    "id": "khepri",
    "archetype": "guerrero",
    "name": "Khepri",
    "title": "El Portador del Enjambre",
    "color": "#3fae8a",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "tempo",
    "passive": {
      "name": "Ritmo de Quitina",
      "desc": "Cada tercer ataque básico inflige un 30% más; los otros dos infligen un 15% menos."
    }
  },
  "velmira": {
    "hp": 165,
    "speed": 170,
    "damage": 22,
    "range": 260,
    "rate": 0.5,
    "skills": [
      "Pulso de las Máscaras",
      "Paso de las Máscaras",
      "Baluarte de las Máscaras",
      "Santuario de las Máscaras"
    ],
    "skillDescriptions": [
      "Pulso de daño y curación cercana.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran pulso de daño y curación aliada."
    ],
    "id": "velmira",
    "archetype": "soporte",
    "name": "Velmira",
    "title": "La Reina de las Máscaras",
    "color": "#c06bd8",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "renewal",
    "passive": {
      "name": "Máscara Compasiva",
      "desc": "Tus curaciones restauran un 20% más; tus ataques básicos infligen un 12% menos."
    }
  },
  "vhal": {
    "hp": 125,
    "speed": 165,
    "damage": 21,
    "range": 290,
    "rate": 0.65,
    "skills": [
      "Pulso Estelar",
      "Paso Estelar",
      "Campo Estelar",
      "Cataclismo Estelar"
    ],
    "skillDescriptions": [
      "Explosión circular que ralentiza.",
      "Desplazamiento con escudo breve.",
      "Zona persistente de daño.",
      "Gran explosión circular y ralentización."
    ],
    "id": "vhal",
    "archetype": "mago",
    "name": "Vhal",
    "title": "El Astrónomo Caído",
    "color": "#6f7cf2",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "focus",
    "passive": {
      "name": "Horizonte Estelar",
      "desc": "Tus ataques básicos infligen un 12% más más allá del 60% de tu alcance y un 12% menos de cerca."
    }
  },
  "bront": {
    "hp": 240,
    "speed": 150,
    "damage": 44,
    "range": 90,
    "rate": 0.55,
    "skills": [
      "Barrido de la Ciudadela",
      "Paso de la Ciudadela",
      "Baluarte de la Ciudadela",
      "Ruptura de la Ciudadela"
    ],
    "skillDescriptions": [
      "Golpe circular de corto alcance.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran golpe circular con escudo personal."
    ],
    "id": "bront",
    "archetype": "tanque",
    "name": "Bront",
    "title": "La Fortaleza Viviente",
    "color": "#8aa4b8",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "bulwark",
    "passive": {
      "name": "Placas de Ciudadela",
      "desc": "Tus escudos absorben un 15% más. Mientras tienes escudo te mueves un 8% más lento."
    }
  },
  "oriel": {
    "hp": 165,
    "speed": 170,
    "damage": 22,
    "range": 260,
    "rate": 0.5,
    "skills": [
      "Pulso de las Cicatrices",
      "Paso de las Cicatrices",
      "Baluarte de las Cicatrices",
      "Santuario de las Cicatrices"
    ],
    "skillDescriptions": [
      "Pulso de daño y curación cercana.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran pulso de daño y curación aliada."
    ],
    "id": "oriel",
    "archetype": "soporte",
    "name": "Oriel",
    "title": "La Portera de las Cicatrices",
    "color": "#e05a7a",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "bulwark",
    "passive": {
      "name": "Umbral Protector",
      "desc": "Tus escudos absorben un 15% más. Mientras tienes escudo te mueves un 8% más lento."
    }
  },
  "saelis": {
    "hp": 165,
    "speed": 170,
    "damage": 22,
    "range": 260,
    "rate": 0.5,
    "skills": [
      "Pulso del Plumaje",
      "Paso del Plumaje",
      "Baluarte del Plumaje",
      "Santuario del Plumaje"
    ],
    "skillDescriptions": [
      "Pulso de daño y curación cercana.",
      "Desplazamiento con escudo breve.",
      "Escudo para aliados cercanos y daño circular.",
      "Gran pulso de daño y curación aliada."
    ],
    "id": "saelis",
    "archetype": "soporte",
    "name": "Saelis",
    "title": "La Heraldo del Plumaje",
    "color": "#9cd0f0",
    "ownerOnly": false,
    "founder": null,
    "adapted": true,
    "signature": "renewal",
    "passive": {
      "name": "Plumaje Vital",
      "desc": "Tus curaciones restauran un 20% más; tus ataques básicos infligen un 12% menos."
    }
  }
};
for(const role of Object.values(ROLES)){Object.freeze(role.skills);Object.freeze(role.skillDescriptions);Object.freeze(role.passive);Object.freeze(role);}
for(const signature of Object.values(SIGNATURES))Object.freeze(signature);
const api=Object.freeze({ROLES:Object.freeze(ROLES),SIGNATURES:Object.freeze(SIGNATURES),VERSION:'arena-roster-2',NOTICE:'Kits competitivos normalizados por rol y diez especialidades con ventajas y contrapartidas. Las habilidades y pasivas de campaña se adaptan a estas reglas.'});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CW_ROSTER=api;
})(typeof globalThis!=='undefined'?globalThis:this);
