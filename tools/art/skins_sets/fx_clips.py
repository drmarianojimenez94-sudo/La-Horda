"""Cajas (coordenadas de la hoja) de cada clip de efecto por skin. Salen de `fx.py --scan`
(componentes numerados); las que el brillo pegaba se separaron a mano. Un clip = cuadros en orden.
El uso de cada clip por habilidad está en js/systems/skin-fx.js (SKIN_FX_PLAN)."""
CLIPS = {
    # Sylva, Flecha de Fuego (Cazadora): flechas de fuego, fénix, sellos y estallidos
    'manada': {
        'arrow':  {'boxes': [(18, 680, 67, 711)]},
        'bigarrow': {'boxes': [(437, 673, 536, 717)]},
        'sigil':  {'boxes': [(427, 831, 460, 884), (469, 831, 496, 882)], 'ground': True},
        'burst':  {'boxes': [(348, 755, 408, 825)]},
        'rain':   {'boxes': [(239, 749, 301, 837), (302, 765, 340, 838), (121, 852, 236, 977)]},
        'phoenix': {'boxes': [(538, 788, 691, 876)]},
        'swirl':  {'boxes': [(416, 724, 529, 823)]},
    },
    # Musashi, Samurái Legendario: tajos carmesí, pétalos y columnas
    'errante': {
        'slash':  {'boxes': [(243, 676, 321, 759)]},
        'bigslash': {'boxes': [(107, 677, 236, 760)]},
        'petals': {'boxes': [(533, 854, 552, 888), (565, 856, 590, 887), (602, 857, 629, 886)]},
        'cuts':   {'boxes': [(617, 761, 701, 834), (707, 754, 743, 834), (754, 728, 795, 817)]},
        'burst':  {'boxes': [(456, 761, 609, 838)]},
        'ring':   {'boxes': [(127, 958, 227, 985)], 'ground': True},
        'pillar': {'boxes': [(18, 845, 117, 986)]},
    },
    # Eren, Titán Bestia: roca, estacas de piedra y anillos de impacto
    'legion': {
        'streak': {'boxes': [(842, 704, 881, 719)]},
        'ring':   {'boxes': [(1034, 900, 1127, 935)], 'ground': True},
        'spikes': {'boxes': [(936, 740, 1009, 816)]},
        'quake':  {'boxes': [(1017, 737, 1128, 816)]},
        'bigring': {'boxes': [(783, 895, 934, 933)], 'ground': True},
    },
    # Axiom, Skin Z (Realidad Corrupta): glitch violeta
    'sistema': {
        'orb':    {'boxes': [(1124, 917, 1145, 933)]},
        'sigil':  {'boxes': [(815, 824, 863, 867)]},
        'eye':    {'boxes': [(1048, 965, 1093, 996)], 'ground': True},
        'pillar': {'boxes': [(875, 927, 947, 998)]},
        'portal': {'boxes': [(1151, 819, 1231, 916)]},
        'shard':  {'boxes': [(1105, 939, 1141, 997)]},
        'bigpillar': {'boxes': [(959, 917, 1037, 997)]},
        'cube':   {'boxes': [(1156, 928, 1223, 995)]},
    },
    # La Profeta, Ángel Caído: medialunas violetas, cruces y espadas caídas
    'profecia': {
        'slash':  {'boxes': [(512, 714, 574, 776)]},
        'cross':  {'boxes': [(809, 782, 887, 866)], 'ground': True},
        'beams':  {'boxes': [(906, 768, 940, 865), (946, 768, 981, 866)]},
        'sigil':  {'boxes': [(496, 793, 585, 866)]},
        'spin':   {'boxes': [(587, 711, 699, 777), (382, 798, 490, 862)]},
        'eruption': {'boxes': [(375, 899, 527, 986)]},
        'swords': {'boxes': [(649, 881, 679, 968), (679, 877, 740, 978), (742, 881, 772, 968)]},
        'star':   {'boxes': [(916, 890, 984, 978)]},
    },
    # Mago, Ángel Arcano: escarcha, rayo azul, fuego y luz dorada
    'convergencia': {
        'star':   {'boxes': [(223, 718, 254, 747)]},
        'flames': {'boxes': [(94, 775, 167, 871), (172, 776, 231, 871), (238, 774, 298, 871), (306, 777, 357, 871)]},
        'icering': {'boxes': [(253, 630, 356, 686)], 'ground': True},
        'crown':  {'boxes': [(366, 622, 455, 686)]},
        'spark':  {'boxes': [(498, 700, 549, 759), (223, 718, 254, 747)]},
        'rune':   {'boxes': [(281, 891, 362, 970)], 'ground': True},
        'light':  {'boxes': [(454, 886, 501, 971), (511, 915, 553, 971)]},
    },
    # Segador, Leónidas: tajos rojos, torbellinos y lanzas espartanas
    'marea': {
        'slash':  {'boxes': [(202, 669, 265, 704)]},
        'bigslash': {'boxes': [(506, 788, 583, 841)]},
        'whirl':  {'boxes': [(263, 726, 404, 779)], 'ground': True},
        'star':   {'boxes': [(689, 662, 740, 710)]},
        'burst':  {'boxes': [(113, 934, 204, 986), (249, 933, 357, 987)]},
        'vortex': {'boxes': [(418, 719, 551, 780)]},
        'spears': {'boxes': [(175, 842, 250, 921), (280, 842, 340, 921)]},
    },
    # Asesino, Jack el Destripador: medialunas carmesí, niebla roja y sellos de sangre
    'nocturno': {
        'slash':  {'boxes': [(121, 731, 183, 779)]},
        'bigslash': {'boxes': [(188, 730, 282, 779)]},
        'blood':  {'boxes': [(125, 953, 160, 985)]},
        'triple': {'boxes': [(395, 729, 499, 781)]},
        'sigil':  {'boxes': [(400, 793, 456, 841)], 'ground': True},
        'star':   {'boxes': [(389, 957, 447, 987)]},
        'mist':   {'boxes': [(223, 793, 285, 840), (473, 795, 543, 842), (568, 798, 665, 844)]},
    },
    # Sanadora, Ángel del Alba: cruces rosadas, corazones alados y columnas de luz
    'custodio': {
        'orb':    {'boxes': [(221, 955, 257, 991)]},
        'cross':  {'boxes': [(473, 613, 583, 690)], 'ground': True},
        'heart':  {'boxes': [(300, 704, 390, 768)]},
        'shield': {'boxes': [(101, 621, 162, 685), (179, 622, 261, 683), (270, 618, 358, 686)]},
        'pillars': {'boxes': [(99, 849, 161, 939), (170, 850, 222, 939), (232, 849, 294, 939)]},
        'dome':   {'boxes': [(300, 850, 447, 939)], 'ground': True},
        'bigcross': {'boxes': [(104, 697, 158, 773)]},
    },
}
