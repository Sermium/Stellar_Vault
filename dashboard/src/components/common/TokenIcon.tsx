import React from 'react';

interface TokenIconProps {
  symbol: string;
  address?: string;
  size?: string;
  className?: string;
}

const LOGO_DATA: Record<string, string> = {
  XLM: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Ccircle cx='150' cy='150' r='150' fill='%23000000'/%3E%3Cg transform='translate(32, 50)'%3E%3Cpath fill='%23FFFFFF' d='M203,26.16l-28.46,14.5-137.43,70a82.49,82.49,0,0,1-.7-10.69A81.87,81.87,0,0,1,158.2,28.6l16.29-8.3,2.43-1.24A100,100,0,0,0,18.18,100q0,3.82.29,7.61a18.19,18.19,0,0,1-9.88,17.58L0,129.57V150l25.29-12.89,0,0,8.19-4.18,8.07-4.11v0L186.43,55l16.28-8.29,33.65-17.15V9.14Z'/%3E%3Cpath fill='%23FFFFFF' d='M236.36,50,49.78,145,33.5,153.31,0,170.38v20.41l33.27-16.95,28.46-14.5L199.3,89.24A83.45,83.45,0,0,1,200,100,81.87,81.87,0,0,1,78.09,171.36l-1,.53-17.66,9A100,100,0,0,0,218.18,100c0-2.57-.1-5.14-.29-7.68a18.2,18.2,0,0,1,9.87-17.58l8.6-4.38Z'/%3E%3C/g%3E%3C/svg%3E",
  USDC: "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='128' cy='128' r='128' fill='%232775CA'/%3E%3Cpath d='M163.3 148.6c0-18.5-11-27.7-33-30.6-15.8-2.2-18.9-6.7-18.9-14.5s5.5-12.8 16.5-12.8c9.9 0 15.4 3.3 18.2 11.6.5 1.6 2 2.7 3.6 2.7h8.3c2.2 0 3.8-1.6 3.8-3.8v-.5c-2.7-14.8-14-25.6-29.1-27.4v-15c0-2.2-1.6-3.8-4.1-4.4h-8c-2.2 0-3.8 1.6-4.1 3.8v14.6c-19 2.7-31.3 15.6-31.3 31.5 0 19.5 11.5 27.4 33.5 30.3 14.8 2.5 18.4 6.3 18.4 14.8s-7.4 14.3-17.3 14.3c-13.5 0-18.4-5.8-19.8-13.5-.5-1.9-2-3-3.6-3h-8.8c-2.2 0-3.8 1.6-3.8 3.8v.5c2.5 16.2 12.6 26.5 32.2 29.3v15c0 2.2 1.6 3.8 4.1 4.4h8c2.2 0 3.8-1.6 4.1-3.8v-15c19-3 31.1-16.2 31.1-32.3z' fill='%23fff'/%3E%3Cpath d='M102.4 205.3c-42-15.1-63.8-61.2-48.4-103.5 7.9-22 25.1-38.9 47.1-46.8 2.2-.8 3.6-2.7 3.6-5.2V42c0-2.2-1.4-3.8-3.6-3.8-.5 0-1.4 0-1.9.3-50.2 16.2-77.9 70-61.6 120.2 10.2 31.3 35.2 55.8 66.5 65.7 2.2.8 4.4-.5 5.2-2.5.3-.5.3-1.1.3-1.6v-7.9c0-1.6-1.4-3.6-3.6-4.4-.3-.3-.3-.3.4-.7zm53.1-167c-2.2-.8-4.4.5-5.2 2.5-.3.5-.3 1.1-.3 1.6v7.9c0 2.2 1.4 4.1 3.6 5 42 15.1 63.8 61.2 48.4 103.5-7.9 22-25.1 38.9-47.1 46.8-2.2.8-3.6 2.7-3.6 5.2v7.9c0 2.2 1.4 3.8 3.6 3.8.5 0 1.4 0 1.9-.3 50.2-16.2 77.9-70 61.6-120.2-10.2-31.6-35.2-56.1-66.5-66-.3.3.3.3-.4.3z' fill='%23fff'/%3E%3C/svg%3E",
  EURC: "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='128' cy='128' r='128' fill='%231434CB'/%3E%3Ctext x='128' y='160' text-anchor='middle' fill='white' font-size='120' font-family='Arial' font-weight='bold'%3E%E2%82%AC%3C/text%3E%3C/svg%3E",
};

const GRADIENTS: Record<string, string> = {
  XLM: 'from-black to-gray-800',
  USDC: 'from-blue-500 to-blue-700',
  EURC: 'from-indigo-600 to-indigo-800',
};

export const TokenIcon: React.FC<TokenIconProps> = ({ symbol, size = 'w-10 h-10', className = '' }) => {
  const upperSymbol = symbol.toUpperCase();
  const logoData = LOGO_DATA[upperSymbol];
  const gradient = GRADIENTS[upperSymbol] || 'from-purple-500 to-blue-500';

  if (logoData) {
    return <img src={logoData} alt={symbol} className={`${size} ${className} rounded-full`} />;
  }

  return (
    <div className={`${size} ${className} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
      <span className="text-white font-bold text-lg">{symbol.charAt(0).toUpperCase()}</span>
    </div>
  );
};

export default TokenIcon;
