import type { LevelDef } from "./types";

/**
 * Map legend
 *  # wall   . floor   @ Osea   & Lois
 *  $ stone box   W wood (Osea burns)   I ice (Lois pops)
 *  E exit   F lava (only Osea)   ~ water (only Lois)
 *  1-9 pressure plate channel   A-I gate (A=1 … I=9)
 */
export const LEVELS: LevelDef[] = [
  {
    id: "1",
    title: "Primii pași",
    lesson: "Mișcare și schimb",
    hint: "Săgeți sau WASD ca să mergi. Tab schimbă între Osea și Lois. Du-i pe amândoi pe portal.",
    map: [
      "#########",
      "#@....E.#",
      "#.......#",
      "#&....E.#",
      "#########",
    ],
  },
  {
    id: "2",
    title: "Împinge",
    lesson: "Cutii",
    hint: "Mergi în cutie ca s-o împingi. Fiecare își curăță culoarul până la portal.",
    map: [
      "###########",
      "#@..$....E#",
      "###########",
      "#&..$....E#",
      "###########",
    ],
  },
  {
    id: "3",
    title: "Nu vă blocați",
    lesson: "Spațiu comun",
    hint: "Osea și Lois nu pot sta pe aceeași pătrățică. Împinge cutia la o parte ca să treceți amândoi.",
    map: [
      "##########",
      "#@.......#",
      "#...$..EE#",
      "#&.......#",
      "##########",
    ],
  },
  {
    id: "4",
    title: "Placa",
    lesson: "Greutate",
    hint: "Pune cutia pe placa rotundă. Poarta rămâne deschisă cât timp placa e apăsată.",
    map: [
      "###########",
      "#@........#",
      "#...$..1..#",
      "#&........#",
      "#####A#####",
      "#....EE...#",
      "###########",
    ],
  },
  {
    id: "5",
    title: "Echipă",
    lesson: "Stai pe placă",
    hint: "Osea trebuie să stea pe placa de sus — ea deschide poarta lui Lois. Apoi Lois trece la portal.",
    map: [
      "#########",
      "#@....2E#",
      "#.......#",
      "#######B#",
      "#&......#",
      "#########",
    ],
    plateIsExit: [2],
  },
  {
    id: "6",
    title: "Focul lui Osea",
    lesson: "Abilitate",
    hint: "Cu Osea, uită-te spre ladă și apasă Spațiu. Flacăra arde lemnul. Lois nu poate arde.",
    map: [
      "###########",
      "#@..W.W..E#",
      "#.........#",
      "#&.......E#",
      "###########",
    ],
  },
  {
    id: "7",
    title: "Bulele lui Lois",
    lesson: "Gheață",
    hint: "Cu Lois, apasă Spațiu spre cristalul de gheață. Bulele îl sparg. Osea nu poate sparge gheața.",
    map: [
      "###########",
      "#@.......E#",
      "#.........#",
      "#&..I.I..E#",
      "###########",
    ],
  },
  {
    id: "8",
    title: "Foc și apă",
    lesson: "Terenuri",
    hint: "Lava o trece doar Osea. Apa o trece doar Lois. Mergeți pe drumurile voastre.",
    map: [
      "#############",
      "#@..FFFFF..E#",
      "#############",
      "#&..~~~~~..E#",
      "#############",
    ],
  },
  {
    id: "9",
    title: "Podul",
    lesson: "Cutia ca pod",
    hint: "Osea nu trece apa, Lois nu trece lava. Împinge cutia pe terenul interzis — devine pod.",
    map: [
      "##############",
      "#@.$.....~..E#",
      "#............#",
      "#&..$....F..E#",
      "##############",
    ],
  },
  {
    id: "10",
    title: "Împreună",
    lesson: "Finala",
    hint: "Arde, sparge, împinge, stai pe placă. Amândoi pe portal.",
    map: [
      "##############",
      "#@..W..$..1AE#",
      "#............#",
      "#~~~~........#",
      "#FFF.........#",
      "#&..I.I....2E#",
      "##############",
    ],
    plateIsExit: [2],
  },
];

export function levelCount() {
  return LEVELS.length;
}
