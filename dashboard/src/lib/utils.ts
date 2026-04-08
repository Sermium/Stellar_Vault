export const truncateAddress = (address: string, chars = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const formatAmount = (amount: bigint | string | number, decimals: number = 7): string => {
  // Convert to bigint if needed
  let amountBigInt: bigint;
  if (typeof amount === 'bigint') {
    amountBigInt = amount;
  } else if (typeof amount === 'string') {
    // Handle empty string or invalid values
    const cleaned = amount.replace(/[^0-9-]/g, '');
    amountBigInt = cleaned ? BigInt(cleaned) : BigInt(0);
  } else if (typeof amount === 'number') {
    amountBigInt = BigInt(Math.floor(amount));
  } else {
    amountBigInt = BigInt(0);
  }

  const divisor = BigInt(10 ** decimals);
  const isNegative = amountBigInt < BigInt(0);
  const absAmount = isNegative ? -amountBigInt : amountBigInt;
  
  const integerPart = absAmount / divisor;
  const fractionalPart = absAmount % divisor;

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.slice(0, 4).replace(/0+$/, '');

  const sign = isNegative ? '-' : '';
  
  if (trimmedFractional) {
    return `${sign}${integerPart.toLocaleString()}.${trimmedFractional}`;
  }
  return `${sign}${integerPart.toLocaleString()}`;
};

export const formatUSD = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
