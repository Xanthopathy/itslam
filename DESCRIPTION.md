## Project Scope

This project is meant to be a simple web app clone of Zedaph's Is That Sheep Looking At Me card game, to be hosted on github for a small group of 4 players and doesn't require infrastructure for more than that.

## The Goal

The objective of the game is to have the largest flock of sheep in your field (the table area in front of you) at the end of the game.

## Setup

1. Deal: Shuffle the deck and deal 5 cards to each player.

2. Piles: Place the remaining deck face down in the center to form a draw pile and leave space next to it for a discard pile.

3. Fields: Each player uses the area of the table directly in front of them as their "field" to build their flock.

4. First Player: The person who saw a real-life sheep most recently goes first, and play moves clockwise.

## How to Make Sheep

To score points, you must place valid sheep cards into your field. You can build them in a few ways:

- Standard Matching: A valid sheep consists of a head and a butt of the same color. (worth 1 point)

- Rainbow Cards: A rainbow head or rainbow butt can match with any color. If you combine a rainbow head and a rainbow butt, you create a Full Rainbow Sheep (worth 2 points).

- Modifiers: (makes a match worth 1 point)
  - Paint Modifier: Allows you to combine any color head and butt together.

  - Franken Modifier: Allows you to combine 2 butts or 2 heads together into a "Franken Sheep".

  - Only 1 modifier may be put on one sheep at a time, and they can only be played if they actively resolve an invalid sheep state.

- Body Swapping: You can upgrade or replace parts of existing sheep in your own field or an opponent's field, provided you leave a complete matching sheep behind. If you fix a painted sheep in an opponent's field, you take the replaced part and the modifier card into your hand.

## Action Cards

- Yoink: Blindly steal 2 cards from an opponent’s hand.

- Wheat: Lure a sheep from anyone's field to yours. (Protected by double-butted Franken Sheep, because it has no mouth to eat wheat).

- Wolf: Completely discard a sheep from someone's field. (Protected by double-headed Franken Sheep, because it can see the wolf coming).

- Reflip: Forces a coin re-flip if you don't like the result of an "Is That Sheep Looking At Me" card.

## "Is That Sheep Looking At Me?" Cards (Chaos Cards)

These 5 powerful cards trigger a coin-flip mechanic where you predict whether the sheep coin is or isn't looking at you. If you guess correctly, you use the effect; if you're wrong, your opponent uses it against you. They bypass Franken Sheep protections, and you can only play 1 per turn.

Order of events: A player picks their opponent -> The player makes a prediction -> The coin is flipped -> the Chaos card is resolved.

- Lure 2 sheep: Move 2 sheep from an opponent's field to yours.

- Remove 2 sheep: Send 2 sheep directly to the discard pile.

- Yoink entire hand: Take the loser's entire hand of cards. (If you're the loser, you effectively end your turn.)

- Halve 2 sheep: Deconstruct 2 of your opponent's sheep, taking the heads/butts and modifiers to your hand (the opponent must pick up the remaining bits). (This means you take 1 piece per sheep and a modifier if that one has it, the opponent still gets to keep remaining bits from their halved sheeps, which immediately go back into their hand)

- Recover 1 sheep: Pick up the discard pile and play any valid sheep from it into your field.

## Structure of a Turn

1. Draw: Start your turn by drawing 1 card. You must have at least 3 cards in hand, so keep drawing until you do.

2. Play: Play as many or as few cards as you want (making sheep, body swapping, or playing actions/chaos cards).

3. Discard & End: You cannot end your turn with more than 7 cards in hand. Discard down to 7 if necessary (you cannot discard Chaos cards). You are not required to discard should you hold more than 7 cards outside of your turn.

4. The Sign: To officially end your turn, you must proudly baa like a sheep.

## Game End and Scoring

Once the draw pile runs out, a final round is triggered where everyone gets one last turn.

Scoring:

- +1 Point for every standard valid sheep in your field.

- +2 Points for every Full Rainbow Sheep.

- -3 Points for every Chaos ("Is That Sheep Looking At Me?") card left in your hand.
