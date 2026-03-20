const FRUITS = ['banana', 'strawberry', 'lemon', 'plum'];
const ANIMALS = ['monkey', 'elephant', 'pig'];

function countByProperty(cards, property) {
  return cards.reduce((acc, card) => {
    const value = card[property];
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function checkFiveOfAKind(centerPile) {
  if (centerPile.length < 5) return { valid: false };
  
  const lastFive = centerPile.slice(-5);
  const fruitCounts = countByProperty(lastFive, 'fruit');
  
  for (const fruit of FRUITS) {
    if (fruitCounts[fruit] === 5) {
      return {
        valid: true,
        condition: 'five-of-a-kind',
        detail: `5 个${getFruitName(fruit)}`
      };
    }
  }
  
  return { valid: false };
}

function checkFiveAnimals(centerPile) {
  if (centerPile.length < 5) return { valid: false };
  
  const lastFive = centerPile.slice(-5);
  const animalCount = lastFive.filter(card => card.type === 'animal').length;
  
  if (animalCount === 5) {
    return {
      valid: true,
      condition: 'five-animals',
      detail: '5 张动物牌'
    };
  }
  
  return { valid: false };
}

function checkFourSpecies(centerPile) {
  if (centerPile.length < 4) return { valid: false };
  
  const lastFour = centerPile.slice(-4);
  const fruitSet = new Set();
  
  for (const card of lastFour) {
    if (card.type === 'fruit') {
      fruitSet.add(card.fruit);
    } else {
      fruitSet.add(card.animal);
    }
  }
  
  if (fruitSet.size === 4) {
    return {
      valid: true,
      condition: 'four-species',
      detail: '4 种不同的水果/动物'
    };
  }
  
  return { valid: false };
}

function checkTwoPairs(centerPile) {
  if (centerPile.length < 4) return { valid: false };
  
  const lastFour = centerPile.slice(-4);
  const countMap = {};
  
  for (const card of lastFour) {
    const key = card.type === 'fruit' ? `fruit-${card.fruit}` : `animal-${card.animal}`;
    countMap[key] = (countMap[key] || 0) + 1;
  }
  
  const pairs = Object.values(countMap).filter(count => count === 2).length;
  
  if (pairs >= 2) {
    return {
      valid: true,
      condition: 'two-pairs',
      detail: '2 对相同的牌'
    };
  }
  
  return { valid: false };
}

function checkAscending(centerPile) {
  if (centerPile.length < 3) return { valid: false };
  
  const lastThree = centerPile.slice(-3);
  
  if (lastThree.some(card => card.type !== 'fruit')) {
    return { valid: false };
  }
  
  const counts = lastThree.map(card => card.count);
  const sorted = [...counts].sort((a, b) => a - b);
  
  const isAscending = sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2];
  
  if (isAscending) {
    return {
      valid: true,
      condition: 'ascending',
      detail: `连续数字 ${counts.join('-')}`
    };
  }
  
  return { valid: false };
}

function getFruitName(fruit) {
  const names = {
    banana: '香蕉',
    strawberry: '草莓',
    lemon: '柠檬',
    plum: '李子'
  };
  return names[fruit] || fruit;
}

export function validateBell(centerPile, enableAnimals = true) {
  if (!centerPile || centerPile.length === 0) {
    return {
      valid: false,
      failedReason: '牌堆为空'
    };
  }
  
  const classicResult = checkFiveOfAKind(centerPile);
  
  if (!enableAnimals) {
    return classicResult;
  }
  
  const conditions = [
    checkFiveOfAKind(centerPile),
    checkFiveAnimals(centerPile),
    checkFourSpecies(centerPile),
    checkTwoPairs(centerPile),
    checkAscending(centerPile)
  ];
  
  for (const result of conditions) {
    if (result.valid) {
      return result;
    }
  }
  
  return {
    valid: false,
    failedReason: '不满足任何按铃条件'
  };
}

export default validateBell;
