/*
========================================
UTILITY: PLAYER HIT RESPONSE
AUTHOR: Georgia Sweeny
DESCRIPTION:
- Handles player damage and knockback when the player overlaps
  with any damaging entity (enemy, hazard, etc.)
- Treats all sources generically — no type-specific logic
- Enforces an invulnerability window to prevent repeated rapid hits

RULES:
- No rendering or drawing
- Does not depend on enemy or hazard implementation details
- Source only needs to expose a center position (position.x/y or x/y)

USAGE:
import { handlePlayerHit } from '../utils/playerHitResponse.js';
handlePlayerHit(player, sourceEntity, COMBAT);
========================================
*/

//======================================
// PLAYER HIT RESPONSE
//======================================
import { TIME } from '../config.js';

/**
 * Applies damage and knockback to the player on contact with a source entity.
 *
 * @param {Player}  player  - The player instance.
 * @param {object}  source  - Damaging entity; must have a center position
 *                            via source.position.x/y (Hitbox) or source.x/y (plain object).
 * @param {object}  config  - Tuning values (see COMBAT in config.js).
 **/

export function handlePlayerHit(player, source, config) {
   // --- i-frame check --- //
   // Exit early if the player was hit within the invulnerability window.
   const now = millis();
   if (player.lastHitTime != null && now - player.lastHitTime < config.IFRAME_DURATION_MS) {
      return;
   }

   /*
   // --- Apply hit/contact damage (hazrds & enemies)--- //
   // Uses the same direct power reduction pattern
 
   player.power.current = Math.max(0, player.power.current - config.HIT_DAMAGE); 
   //replace with encapsulated damage per hazard/enemy type or remove and damage behaviour 
   */

   // --- Compute knockback direction --- //
   /* Resolve source centre from either a Hitbox instance (position.x/y) or a
      plain room object (x/y already at centre after roomSystem normalisation).
   */
   const srcX = source.position?.x ?? source.x;
   const srcY = source.position?.y ?? source.y;

   const dx = player.position.x - srcX;
   const dy = player.position.y - srcY;
   const dist = Math.sqrt(dx * dx + dy * dy);

   // Default push direction if the centres coincide exactly (edge case).
   const normX = dist > 0 ? dx / dist : 1;
   const normY = dist > 0 ? dy / dist : 0;

   // --- Apply knockback velocity --- //
   player.velocity.x = normX * config.KNOCKBACK_STRENGTH * TIME.fixedDeltaTime;
   player.velocity.y = normY * config.KNOCKBACK_STRENGTH * TIME.fixedDeltaTime
      - config.KNOCKBACK_LIFT * TIME.fixedDeltaTime;

   // --- Record hit timestamp --- //
   // lastHitTime gates the i-frame window.
   // damageFlashTime is read by the render system to drive the visual flash;
   // kept separate so flash duration and i-frame duration can be tuned independently.
   player.lastHitTime = now;
   player.damageFlashTime = now;
}

//======================================
// END
//======================================
