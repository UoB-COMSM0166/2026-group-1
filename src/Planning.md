Planning for code (optional)
Write here to document your though process (make a new section for your feature)

Hitbox logic - Nick
====================

CLASS DESIGN
------------
- will have 2 hitbox types to start of with
  |_ 1 - wall - static, not player controlled, no movement vector
  |_ 2 - player - movable, player controlled, movement vector
- all share similarities
  |_ made up of square or rectangular boundaries
  |_ created through x, y, width and height
  |_ contain an x, y midpoint (current position)
  |_ can be drawn
  |_ contain get methods for private data retrieval
- create a hitbox superclass that can be called in wall and player to reduce amount of code
 
CALCULATING BOUNDARIES
----------------------
[improving zone logic and classes]
- need to know which side of wall collided with player to properly resolve collision 
- 2 methods that come to mind, each using zones
  |_ 1 - corner gradient through midpoint
  |  |_    
  |  |     \  0  /
  |  |      \===/
  |  |    3 |\ /| 1
  |  |      |/ \|
  |  |      /===\
  |  |     /  2  \
  |  |
  |  |_ simple to implement
  |  |_ gradient2 = - gradient1 - simple calculation
  |  |_ intercept of both lines calculated through midpoint of hitbox
  |  |_ works with more square shaped hitboxes
  |  |_ does not work well with long and thin hitboxes
  |  |_ currently implemented
  |
  |_ 2 - corner gradient through y = x
     |_
     |     \   0   /
     |      \=====/
     |      |\   /|
     |      | \ / |
     |      |  |  |
     |    3 |  |  | 1
     |      |  |  |
     |      | / \ |
     |      |/   \|
     |      /=====\
     |     /   2   \
     |
     |_ y = x through corners
     |_ issue arises when hitbox is long and thin, boundaries leak into each other causing error
     |_ fix by adding condition that zone is above/below midpoint of hitbox to zone calculation
     |_ more complex to implement
     |_ should work with long and thin shapes as well as squares
     |_ not currently implemented
  
- zoning method has added benefit of stopping clipping under high (but not very high) speeds
  |_ in code below speed 1 works, speed 2 - some clipping, speed 3 - clipping
     |_ speed 1 is very fast so this shouldn't be an issue

[solving player size issue in corner zone transition]
  |_ note: at least 1 zone must be true else hitbox will not be active and clipping occurs
  |  |_ [zone 0, zone 1] ---> [true, false] -> [true, true] -> [false, true], zone equations must have >=, not >
  |_ at the moment midpoint of player determines current zone
  |_ leads to rectangular shaped players not crossing zones correctly
  |_ shown in example below M is midpoint of player
  |_              
  |                              =====
  |          ====/======         |  /|
  |          |  / M    |         | M |
  |          ==/========         |/  |
  |     ======/                  =====
  |     |     |            =====/
  |     |     |            |    |
  |     |     |            |    |
  |     =======            ======
  |
  |_ (right box containing M is supposed to be a square)
  |_ right image - normal, hitbox corner touches corner of player, player is in both zones as expected
  |_ left image - midpoint is in zone 1 but the bottom has not cleared top of the hitbox
  |_ this causes an awkward snap to the right of the hitbox that is quite noticeable when moving down
  |_ since the player is a submarine, which are not typically square, this is an important issue to fix

- how do we go about fixing this?
  |_ currently updateZones method calculated by player midpoint (vec is player center position vector)
  |_ 
  |    updateZones(vec){
  |      var eq1 = (this.gradient1 * vec.x) + this.intercept1;
  |      var eq2 = (this.gradient2 * vec.x) + this.intercept2;
  |      this.zones[0] = (vec.y <= eq1 && vec.y <= eq2);
  |      this.zones[1] = (vec.y <= eq1 && vec.y >= eq2);
  |      this.zones[2] = (vec.y >= eq1 && vec.y >= eq2);
  |      this.zones[3] = (vec.y >= eq1 && vec.y <= eq2);
  |    }
  |
  |_ change logic from midpoint to player edge
  |_ if player left x larger than hitbox right x then allow zone transition from 0 to 1, repeat for each side
  |_ use zone[0] as an example
  |_
  |  x, y = 0  eq1     eq2
  |             \   0  /
  |              \====/
  |              |\  /| 
  |           2  | \/ |  1
  |              | /\ |
  |              |/  \|
  |              /====\
  |             /      \     x, y = 100 (or something else)
  |
  |_ for zone 0
  |  |_ player up y can be ignored?
  |  |_ player down y needs to be less than hitbox up y
  |  |_ player right x needs to be less than hitbox left x 
  |  |_ player left x needs to be greater than hitbox right x
  |_ player up y can be ignored, we can remove the upper 2 corners and look at the lower 2 corners instead
  |_ implementing logic for this just didnt work as vec.x >= eq1 or vec.x < eq2 would not update zones
  |_ solution was to get rid of eq1 and eq2 which use player.x and focus logic calculation on sides of the hitbox
  |_
  |         |     |
  |     0/3 |  0  | 0/1 
  |     ----=======----
  |         |     |
  |       3 |     | 1
  |         |     |
  |     ----=======----
  |     2/3 |  2  | 1/2
  |         |     |
  |         
  |_ in this version for zone 0
  |  |_ player lower y <= hitbox upper y
  |  |_ player right x >= hitbox left x
  |  |_ player left x <= hitbox right x
  |  |_ in an equation this becomes
  |    |_ this.zones[0] = (((vec.x + (player.getWidth() / 2)) >= this.position.x - (this.w / 2)) &&
  |    |                   ((vec.x - (player.getWidth() / 2)) <= this.position.x + (this.w / 2)) &&
  |    |                   ((vec.y + (player.getHeight() / 2)) <= this.position.y - (this.h / 2)));
  |    |_ this seems to work well when implemented (similar logic for zone 2 just look at top y instead)
  |_ zones 1 and 3 can be written as
  |  |_ this.zones[1] = (vec.x - (player.getWidth() / 2) >= this.position.x + (this.w / 2))
  |  |_ this.zones[3] = (vec.x + (player.getWidth() / 2) <= this.position.x - (this.w / 2))
  |_ implementing above logic seems to work perfectly for both non square and square shaped players
  |_ midpoint calculation no longer required and we can remove gradient and intercept variables
  |_ updated zone calculation method below
  |_
  |   updateZones(vec){
  |     this.zones[0] = (((vec.x + (player.getWidth() / 2)) >= this.position.x - (this.w / 2)) &&
  |                     ((vec.x - (player.getWidth() / 2)) <= this.position.x + (this.w / 2)) &&
  |                     ((vec.y + (player.getHeight() / 2)) <= this.position.y - (this.h / 2)));
  |     this.zones[1] = ((vec.x - (player.getWidth() / 2)) >= this.position.x + (this.w / 2))
  |     this.zones[2] = (((vec.x + (player.getWidth() / 2)) >= this.position.x - (this.w / 2)) &&
  |                     ((vec.x - (player.getWidth() / 2)) <= this.position.x + (this.w / 2)) &&
  |                     ((vec.y - (player.getHeight() / 2)) >= this.position.y - (this.h / 2)));
  |     this.zones[3] = ((vec.x + (player.getWidth() / 2)) <= this.position.x - (this.w / 2));
  |   }
  |_ no gradient and intercept needed
  |_ only needed to alter methods in class, everything outside of the method remains unchanged
  |_ one issue still remains which I was hoping was fixed - player still gets caught on edges where wall hitboxes touch
  |_ also need to introduce testing to make sure the hitbox corners are working as intended

Physics engine - multiple contribution
======================================

- There is a choice to be made as to how to handle physics
  |_ fixed timestep
  |  |_ interval between game updates is fixed
  |  |_ consistent and reliable physics that is easier to test
  |  |_ simpler logic for calculating movement or physics
  |  |_ can not keep up with higher refresh rate monitors, needs time to render each frame
  |  |_ can cause problems if physics take longer to calculate than frame count - crash as calculation times from previous frames try to catch up with current frame 
  |_ deltaTime -
     |_ interval between game updates is based on time difference between last and current frame (current monitor refresh rate)
     |_ updates exactly when a frame is rendered leading to smoother rendering
     |_ harder to test due to variable framerates
     |_ can cause issues with frame drops as deltaTime becomes larger
- since fixed timestep is better for physics and deltaTime is better for rendering we can split physics and rendering into 2 systems
  |_ physics handled by fixed timesteps
  |_ rendering handled by deltaTime
  |_ we can use an interpolation to ensure that with a fixed timestep (60 fps) movement looks smooth with a higher refresh rate (75 fps)
  |_ interpolation has to be 60 Hz behind actual simulation leading to input latency problems - should not be an issue as latency is only 1 frame
- interpolation method
  |_ physics fixed, create fixed timestep (deltaTimeFixed = 1 / 60) for physics engine updates

visual position = previous state + (current state - previous state) * alpha
alpha = remainder in accumulator / fixed timestep duration

accumulator
- renderer time
- engine consumes render time in fixedDeltaTime steps


fixed_dt = 1 / 60
frame_rate = 75 (or any)
accumulator = 0;

draw(){
  frameRate(frame_rate);
  accumulator += deltaTime;
  while(accumulator >= fixed_dt){
    previous_state = current_state;
    current state = engineUpdate(fixed_dt);
    accumulator -= fixed_dt;
  }
  alpha = accumulator / fixed_dt;
  render position = previous position + (current position - previous position) * alpha
}

loop 1
- accumulator = 0
- 0 += 0
- accumulator = 0
- 0 >= 0.01666 - false do not update engine

loop 2
- accumulator = 0
- 0 += 0.01333
- accumulator = 0.01333
- 0.01333 >= 0.01666 - false do not update engine

loop 3
- accumulator = 0
- 0.01333 += 0.01333
- accumulator = 0.02666
- 0.02666 >= 0.01666 - true update engine
  - engineupdate
  - 0.02666 -= 0.01666
  - accumulator = 0.01
- 0.01 >= 0.01666 - false do not update engine


might need to clamp initial deltaTime to stop missed first loop

change logic for
- playerSystem
- powerSystem
- renderSystem
- resourceManagmentSystem
- roomSystem
- torchSystem

render position = previous position + (current position - previous position) * alpha
alpha = time accumulated / fixed time step

2 methods for previous position storage
- objects - simpler, slower
- files - complex, (can create save states)

- use object storage for now for simplicity due to time constraints

kep track of
- player position
- camera position
- movable hitboxes/entities

updated render system to include interpolation formula, only need to modify render system components that move (at the time of writing this 14/03/26 that is the camera and player), sonar component might need to be interpolated if future rendering looks odd. Lighting might need interpolation.