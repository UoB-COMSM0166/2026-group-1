**Echo Location**
    (Monal Gupta)

    A standard top-down stealth game where the screen is almost entirely black. The player can only "see" by emitting sound pulses (clapping or walking/clicking to "visualize" surroundings) that temporarily reveal the environment and enemy positions. However, these pulses also alert guards to that location.
    
    ### GamePlay
    
    - **Sound Emission**:
    The map is completely invisible (black). The player can trigger a "pulse" or "clap." This pulse expands from the player, momentarily illuminating walls, obstacles, and enemies.
        - **Clap/Pulse**: Triggers a large, expanding circle of visibility. High visibility but alerts all nearby enemies.
        - **Whisper/Click**: Triggers a tiny, short-range pulse. Low risk of detection but hard to navigate with ???
        - **Throw Stone**: Creates a sound pulse at a distant location to distract guards or check for pits.
    - **Risk/Reward**:
        
        While the pulse reveals the surroundings, it also creates a noise circle that attracts guards to your position if they are within range. 
        
        If a guard physically collides with the player, the player is "caught.”
        
    - **Environmental Cues**:
        
        Stepping on certain tiles (like gravel or water) creates automatic, smaller sound pulses, making some paths more visible but more dangerous. 
        
        Stepping on "Glass Shards" or "Water Puddles" creates an involuntary loud pulse, revealing you to enemies.
        
    
    ### Twists
    
    - **Collect items**: Collect "Batteries" to power a small, dim flashlight (limited resource) or "Sound Decoys" (stones) that can be thrown to reveal a distant area.
    - **Power ups?** Quiet Soles (move faster without generating sound).
    - GPT suggestion: Later levels introduce new complexities, like "Glass Floors" (which make noise when walked on) or "Security Cameras" (which trigger alarms/sound if they see your flashlight).
    
    ### Two challenges I think we would be having,
    
    - **temporal visibility -** DO WE need to ****handle multiple overlapping sound waves fading at different rates without causing lag? or can we do it single player?
    - **sound thing** - Guards cannot "see" the player. They must have a **Memory Map** of where they last heard a sound. The AI needs to differentiate between the player's current location and the location of the sound they just heard. This involves implementing a state machine where guards investigate a "last known sound" coordinate and return to their patrol if nothing is found. *Patrol* -> *Investigate Sound Coordinate* -> *Search Area* -> *Return to Patrol*.
    
    **A TWEAK IN THE IDEA:**
    
    We can make it underwater. A Deep Sea Diver in a trench where light doesn't reach, or a Subterranean Explorer. Need to reach to the surface to win. 
    
    When the ripple hits an object (a jagged rock wall, a sea monster, or a shipwreck), that object lights up briefly and then fades back into the black
    
    **Hold Breath:** A move that makes the player 100% silent but drains a "stamina" bar. If the bar empties, the player gasps loudly, creating a massive sound pulse that reveals them to everyone.
    Higher levels - Introduction of  Currents, water that pushes player into walls

**Metroidvania Style Echolocation Game**
    (Georgia Sweeny)
    
    ## Game Pitch 🔊🗺️
    
    **Style:**
    
    - [**Metroidvania](https://www.google.com/search?sca_esv=f2c259abd1bdf684&sxsrf=ANbL-n6rl62eVKMWB0w4A3mvdJ1UO80R4g%3A1769746593742&q=Metroidvania&sa=X&ved=2ahUKEwja2b_os7KSAxW9QEEAHa_nAqAQxccNegQIPBAB&mstk=AUtExfAQrleS-4oEbHE7xOBupJGTLfDwD9stetvmUAkPy7RzTyN0Ab-uL0VKUdSYoB5jf3uOliRZ6BPcVX9--RX5OqIUHuKss-MBKDQUQK8fwTooPh6spHMVyA92hYputWQB8rDpwfURwTHmek4bNJELrMuryPITTNI-hCp2krWNuo4INmlpm1Zg-GC5ccGA-OQeTOUG7F20ROq06n4SNOJ-dW0-OtbxPdrylAAh7rU7B11FUJ18et1U-9mRQM_TDbLuXaKBZpqiKjK395Ms6bz2DB8X&csui=3):** Large, non-linear map that opens up as you gain new traversal abilities (e.g., double jump, wall climb).
    - **Platformer:** Focus on precise jumping, dashing, and navigating intricate environments.
    - **Exploration:** Uncovering new areas, searching for way to escape.
    
    I think this style and gameplay would really suit the echoloation mechanic. It would feel similar to Hollow Knight and other exploration focused 2D games styles.
    Easy to start build as a simple platformer which would reduced inital complexity, focus less on exploration. 
    
    **Theme:**
    
    - We could make it an “escape the dungeon/platformer” type game with a set map *(theme just has to work with mechanic so can be anything really).*
    - Area/Map based would be super easy to create a demo for.
        - Single room - Enter/exit area by moving to edge of screen or exit point/s
        - Larger areas - Exploration, camera follows player, use to travel to different zones or rooms, eventually find the way out
    
    **Twist:** Echolocation mechanic 
    
    Enemies and environment triggering visuals and well as the player would make gameplay less frustrating. Allows for super simple art style or something more creative later on. Colour palette could be used to differentiate between enemies, resources, the player and environment. 
    
    **Challenges:** Echolocation mechanic, platformer style mechanics (dash, double jump, smash, wall jump etc.)
    
    - Platformer mechanics are really easy to scale - start super simple
    - Can add other features if we have time, feel confident
    
    **Here’s a cool game I found that succesfully uses echolation**
    
    [A Roguelite that uses Echolocation in combat. What do you think?](https://www.reddit.com/r/IndieGaming/comments/1cma5ya/a_roguelite_that_uses_echolocation_in_combat_what/)
    
    I think we could achieve this echolocation/sonar effect using simple layers and and animated masks for the waves. Lingering visuals of enemies/environment could be handled based on time and distance from player - revealed areas don’t fade straight away but stay partially visible for some time. A general proximity around player will always be visible, surface standing on/extremely close things.
    
    Can get this hard line effect on surfaces by using a shader that will “reveal”/ render the hard lines of environment based on these conditions. Would be a fun coding challenge and twist. 
    
    Obviously the art style can be really basic, key thing is the gameplay but of course it would be awesome to have some time to import some cool assets (don’t even have to make them)
    
    **Echo: Defy Death**
    
    ![image.png](attachment:27ded965-d4f0-4f01-8cf2-2b1f30c36909:image.png)
    
    ![image.png](attachment:8ea56302-483c-4890-9869-a897be1c2ac4:image.png)
    
    ![image.png](attachment:d27393b1-9263-4532-8aa6-c6a3acd21fbd:image.png)
    
    ![image.png](attachment:35c4034a-3207-419a-922c-a9966f294a1d:image.png)
    
    ![image.png](attachment:ad1b2798-8256-4590-b5b2-8934b8834487:image.png)
    
    ![image.png](attachment:1ecf9384-bcf9-4db0-9650-b0f573f6a202:image.png)
