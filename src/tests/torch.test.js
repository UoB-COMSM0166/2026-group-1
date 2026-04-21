/*
========================================
TESTING: torch.js
AUTHOR: Georgia Sweeny
========================================
CORE LOGIC
- IF power <= 0 → torch MUST be OFF
- IF torch is ON → power MUST be draining
- power MUST stay within [0, max]
========================================
*/

//import Torch from "../systems/torch.js";

// --- Unit Tests --- //

// torch initialises:
// in Runtime state
     // this.flickerTimer = 0;
     // this.isOn = false;
     // 



// --- Integration Tests --- //

// torch turns OFF when power hits 0
// torch cannot be toggled on when power is 0
// power is drain when torch is on
// power is drained more when torch is on
// flicker behaviour occurs when power reaches 

// --- Edge Cases --- //

// torch toggles on if tileset.tsx not found/rendered??? - real case (torch was still on)