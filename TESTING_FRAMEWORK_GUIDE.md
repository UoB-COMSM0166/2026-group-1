# HOW TO WRITE GOOD TESTS - USING jest.js FRAMEWORK
**jest.js** is a commonly used testing fraamework, it provides features that make testing and debugging code easier.
We will be using it to help us write rubust tests that act the specification/requirements for each feature we code.
</br>
<div align="center">
<img width="607" height="470" alt="image" src="https://github.com/user-attachments/assets/27e91f7c-8021-4419-897f-20c096f769f5" />
</div> </br>

## INSTALLING NPM SO YOU CAN USE JEST
I have already added jest.js to the repo, it's in package.json -  package-lock.json contains the version of jest.js so we all use the same one.

All you have to do is make sure you **have npm package manager installed** in your IDE (coding environment) or machine.
Simply run this in your terminal:
```
npm install <-- makes sure you have (only need to do the first time)

npm test <-- this will run the test files

```

CURRENTLY THERE ARE NO TEST FILES SO WHEN I RUN nmp test...
```
georgia@eduroam-148-68 game_files (main) $ npm test

> sep@1.0.0 test
> jest

No tests found, exiting with code 1
Run with `--passWithNoTests` to exit with code 0
In /Users/georgia/COMSCI/SEP/2026-group-1/game_files
  25 files checked.
  testMatch: **/__tests__/**/*.?([mc])[jt]s?(x), **/?(*.)+(spec|test).?([mc])[jt]s?(x) - 0 matches
  testPathIgnorePatterns: /node_modules/ - 25 matches
  testRegex:  - 0 matches
Pattern:  - 0 matches
georgia@eduroam-148-68 game_files (main) $ 
```
WAHOO!!! It's all working :D

## TESTS DESCRIBE:
- **Given:** declare and set up data
- **When:** perform the action to be tested
- **Then:** assert desired outcome

(arrange, act, assert)


## HOW AND WHERE TO ADD TESTS FOR YOUR FEATURE
Please create a file to contain all of your unit tests follwing this convention: **[featureName].test.js**


### EXAMPLE: torchSystem.test.js 

**How it Looks In File Structure:**

```
├─/systems
|  └─ torchSystem.js
|
├─/tests
|  └─ torchSystem.test.js  <-- TEST FILE
```


**Test File Example:**
```javascript
//======================================
// UNIT TESTS - TORCH SYSTEM
//======================================
/*
Here's an unit test example for torchSystem unit using the jest framework ⬇️
*/

import TorchSystem from "../systems/TorchSystem.js";

describe("TorchSystem", () => {
  it("should default torchOn to false on game initialisation", () => {
    // Arrange (Given)
    const mockWorld = {
      playerIntent: {
        torchOn: false, // initial state when game loads
      },
    };

    const torchSystem = new TorchSystem(mockWorld);

    // Act (When)
    // No action — game has just started

    // Assert (Then)
    expect(mockWorld.playerIntent.torchOn).toBe(false);
  });
});

```
</br>

*Comprehensive Guide:* [js-unit-testing-guide](https://github.com/mawrkus/js-unit-testing-guide.git)

# Definition of Done
- Unit testing, and TDD in particular, helps with a definition of done
- A programming task can be defined as complete with respect to testing
(among other things, including check-in and review)
- The intermediate steps help to indicate state of completion and progress
- Done becomes concrete and visible
  
# GOOD UNIT TESTS:
- Are fully automated, i.e., write code to test code
- Offer good coverage of the code under test, including discontinuities and
  error-handling paths
- Are easy to read and to maintain
- Express the intent of the code under test — they do more than just check it

## Consider what tests are used for
Tests serve two main purposes:

- Automatically check the program still works correctly. Whether the tests are in one file or several does not matter for this purpose.
- Help a human reader make sense of the program. This will be much easier if tests for closely related functionality are kept together, because seeing their coherence is a rapid road to understanding.

```

"So who should you be writing the tests for? For the person trying to understand your code.
Good tests act as documentation for the code they are testing. They describe how the code works.
For each usage scenario, the test(s):

1. Describe the context, starting point, or preconditions that must be satisfied
2. Illustrate how the software is invoked
3. Describe the expected results or postconditions to be verified

Different usage scenarios will have slightly
different versions of each of these."

                                                                                          - Gerard Meszaros
                                                                                   "Write Tests for People"
```

## Cohesive and Focused Tests
- A test should aim to demonstrate one behaviour
- The behaviour should be clear from the test name
- The behaviour should be reflected in the assertions in the test
- But there may be more than one actual assertion within the test

## Short Test Cases
- Long test cases become difficult to read and to maintain
- They also offer poor granularity of feedback, whereas short test cases
  can be more precise on failure
- But of course, if tests are numerous and short, identifier names matter
- Both for the test methods and for their local variables
