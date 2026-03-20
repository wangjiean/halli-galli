const FRUITS = ['banana', 'strawberry', 'lemon', 'plum'];
const ANIMALS = ['monkey', 'elephant', 'pig'];

const ANIMAL_COUNTS = {
  monkey: 3,
  elephant: 3,
  pig: 2
};

function createFruitCards() {
  const cards = [];
  
  for (const fruit of FRUITS) {
    for (let count = 1; count <= 5; count++) {
      cards.push({
        type: 'fruit',
        fruit,
        count
      });
    }
  }
  
  return cards;
}

function createAnimalCards() {
  const cards = [];
  
  for (const animal of ANIMALS) {
    const count = ANIMAL_COUNTS[animal];
    for (let i = 0; i < count; i++) {
      cards.push({
        type: 'animal',
        animal
      });
    }
  }
  
  return cards;
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

export function generateDeck(enableAnimals = true) {
  const fruitCards = createFruitCards();
  
  if (!enableAnimals) {
    return shuffleDeck(fruitCards);
  }
  
  const animalCards = createAnimalCards();
  const fullDeck = [...fruitCards, ...animalCards];
  
  return shuffleDeck(fullDeck);
}

export default generateDeck;
