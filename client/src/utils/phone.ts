// Funções utilitárias para formatação de telefone brasileiro

// Função para formatar telefone brasileiro
export const formatPhoneNumber = (value: string): string => {
  // Remove tudo que não é dígito
  const onlyNumbers = value.replace(/\D/g, '');

  // Se tem 9 dígitos, adiciona código de área 15 (Sorocaba)
  let numbers = onlyNumbers;
  if (numbers.length === 9) {
    numbers = '15' + numbers;
  }

  // Aplica a máscara (00) 00000-0000 ou (00) 0000-0000
  if (numbers.length <= 2) {
    return `(${numbers}`;
  } else if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  } else if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }

  // Se passou de 11 dígitos, limita
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

// Função para remover formatação do telefone antes de salvar
export const unformatPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, '');
};

// Função para formatar número para ligação (com 0 no início para operadoras)
export const formatPhoneForCall = (phone: string): string => {
  const onlyNumbers = unformatPhoneNumber(phone);

  // Se tem 9 dígitos, adiciona código de área 15 (Sorocaba)
  let numbers = onlyNumbers;
  if (numbers.length === 9) {
    numbers = '15' + numbers;
  }

  // Adiciona o 0 no início para operadoras brasileiras
  return `0${numbers}`;
};