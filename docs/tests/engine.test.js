//======================================
// UNIT TESTS - ENGINE (CORE LOOP)
//======================================
/*
Tests for engine.js — verifies system registry, update ordering,
and the optional chaining safety on system hooks.
*/

import { jest } from '@jest/globals';

const { Engine } = await import('../gameEngine/engine.js');

describe('Engine', () => {
  it('registers a system and returns it in the list', () => {
    const engine = new Engine();
    const mockSystem = { update: jest.fn() };
    engine.register(mockSystem);
    expect(engine.systems).toContain(mockSystem);
  });

  it('calls update on all registered systems in order', () => {
    const engine = new Engine();
    const callOrder = [];
    const sys1 = { update: () => callOrder.push('sys1') };
    const sys2 = { update: () => callOrder.push('sys2') };
    const sys3 = { update: () => callOrder.push('sys3') };

    engine.register(sys1);
    engine.register(sys2);
    engine.register(sys3);
    engine.update();

    expect(callOrder).toEqual(['sys1', 'sys2', 'sys3']);
  });

  it('calls update on a single registered system', () => {
    const engine = new Engine();
    const mockSystem = { update: jest.fn() };
    engine.register(mockSystem);
    engine.update();
    expect(mockSystem.update).toHaveBeenCalledTimes(1);
  });

  it('does not throw when a system has no update method', () => {
    const engine = new Engine();
    engine.register({}); // no update method
    engine.register({ update: jest.fn() });
    expect(() => engine.update()).not.toThrow();
  });

  it('does not throw when a system has no update method', () => {
    const engine = new Engine();
    engine.register({}); // no update method — optional chaining handles this
    engine.register({ update: jest.fn() });
    expect(() => engine.update()).not.toThrow();
    expect(engine.systems.length).toBe(2);
  });

  it('can register multiple systems and update multiple times', () => {
    const engine = new Engine();
    const mockSystem = { update: jest.fn() };
    engine.register(mockSystem);
    engine.update();
    engine.update();
    engine.update();
    expect(mockSystem.update).toHaveBeenCalledTimes(3);
  });

  it('systems are independent — updating one does not affect others', () => {
    const engine = new Engine();
    const sysA = { update: jest.fn() };
    const sysB = { update: jest.fn(), data: 0 };
    engine.register(sysA);
    engine.register(sysB);
    engine.update();
    engine.update();
    expect(sysA.update).toHaveBeenCalledTimes(2);
    expect(sysB.update).toHaveBeenCalledTimes(2);
  });

  it('clear systems array by creating a new engine instance', () => {
    const engine1 = new Engine();
    const sys1 = { update: jest.fn() };
    engine1.register(sys1);

    const engine2 = new Engine();
    const sys2 = { update: jest.fn() };
    engine2.register(sys2);

    engine1.update();
    engine2.update();
    expect(sys1.update).toHaveBeenCalledTimes(1);
    expect(sys2.update).toHaveBeenCalledTimes(1);
    expect(engine1.systems.length).toBe(1);
    expect(engine2.systems.length).toBe(1);
  });
});
