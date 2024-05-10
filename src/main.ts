import { PriorityQueue } from "typescript-collections";
import { ErrorMapper } from "utils/ErrorMapper";

declare global {
  /*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */
  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
    creepsTarget: { [x: string]: object }
  }

  interface CreepMemory {
    role: string;
    room: string;
    working: boolean;
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  // console.log(`Current game tick is ${Game.time}`);

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
  const creepCnt = Object.keys(Game.creeps).length
  for (const name in Game.spawns) {
    const spawn = Game.spawns[name]
    if (creepCnt < 3 && spawn.spawning == null) {
      spawn.spawnCreep([WORK, MOVE, CARRY], "Creep" + new Date().getUTCSeconds())
      console.log("duang")
    }
  }
  for (const name in Game.creeps) {

    const creep = Game.creeps[name]
    const sources = creep.room.find(FIND_SOURCES);
    // 如果背包没有装满
    if (creep.store.getFreeCapacity() > 0) {
      if (Memory?.creepsTarget?.[creep.name] == null) {
        // 寻找最近的矿
        const source = sources[0]
        Memory?.creepsTarget?.[creep.name] == source
        if (!creep.pos.isNearTo(source.pos.x, source.pos.y)) {
          const pos = findPath(creep.pos, source.pos)
          creep.moveTo(pos.x, pos.y)
        } else {
          creep.harvest(source)
        }
      }
    } else {
      Memory?.creepsTarget?.[creep.name] == null
      const source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType == STRUCTURE_STORAGE || structure.structureType == STRUCTURE_CONTAINER) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        }
      });
      if (source == null) {
        const target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES)
        if (target) {
          if (!creep.pos.isNearTo(target.pos.x, target.pos.y)) {
            const pos = findPath(creep.pos, target.pos)
            creep.moveTo(pos.x, pos.y)
          } else {
            creep.build(target)
          }
        }
      }
      // const source = Game.spawns[0]
      if (source != null) {
        if (!creep.pos.isNearTo(source.pos.x, source.pos.y)) {
          const pos = findPath(creep.pos, source.pos)
          creep.moveTo(pos.x, pos.y)
        } else {
          creep.transfer(source, RESOURCE_ENERGY, creep.store.energy)
        }
      }
    }
  }
});

const findPath = (start: RoomPosition, end: RoomPosition) => {
  const frontier = new PriorityQueue<{pos: RoomPosition, value: number}>((a,b) => a.value-b.value);
  frontier.enqueue({pos: start, value: 0})
  let came_from: { [x: string]: RoomPosition } = {}
  let cost_so_far: { [x: string]: number } = {}
  came_from[`${start.x}-${start.y}`] = start
  cost_so_far[`${start.x}-${start.y}`] = 0

  while (!frontier.isEmpty) {
    const item = frontier.dequeue()
    if(item == null){
      break;
    }
    const current = item.pos;

    if (current.isNearTo(end.x, end.y)) {
      came_from[`${end.x}-${end.y}`] = current
      break;
    }
    // if (current?.x == end.x && current?.y == end.y)
    // break

    for (const [offsetX, offsetY] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const next = Game.rooms[end.roomName].getPositionAt(current.x + offsetX, current.y + offsetY)
      if (next == null || Game.map.getRoomTerrain(end.roomName).get(next.x, next.y) == TERRAIN_MASK_WALL) {
        continue
      }
      const nextName = `${next?.x}-${next?.y}`
      const newCost = cost_so_far[`${current?.x}-${current?.y}`] + 1//1为步长，可以根据地形增加
      if (cost_so_far[nextName] == null || newCost < cost_so_far[nextName]) {
        cost_so_far[nextName] = newCost
        const priority = newCost + Math.sqrt(Math.pow(end.x - next?.x ?? 0, 2) + Math.pow(end.y - next?.y ?? 0, 2));//曼哈顿距离
        frontier.enqueue({pos: next, value:priority})
        came_from[nextName] = current
      }
    }
  }
  // console.log(JSON.stringify(came_from))
  for (let flagName in Game.flags) {
    Game.flags[flagName].remove();
  }
  let pos = end
  try {
    while (!pos.isNearTo(start.x, start.y)) {
      const name = `${pos.x}-${pos.y}`
      Game.rooms[end.roomName].createFlag(pos.x, pos.y, name, COLOR_RED);
      pos = came_from[name]
    }
  } catch (e) {
    // console.log(pos, e)
  }
  return pos;

}


// class MinPriorityQueue {
//   queue: { value: RoomPosition, priority: number }[];
//   constructor() {
//     this.queue = [];
//   }

//   put(value: RoomPosition, priority: number) {
//     this.queue.push({ value, priority });
//     this.queue.sort((a, b) => a.priority - b.priority);
//   }

//   get() {
//     return this.queue.shift();
//   }

//   peek() {
//     return this.queue[0];
//   }

//   size() {
//     return this.queue.length;
//   }

//   empty() {
//     return this.size() === 0;
//   }
// }
