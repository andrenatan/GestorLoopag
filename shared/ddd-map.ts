export const dddToState: Record<string, string> = {
  // São Paulo
  "11": "SP", "12": "SP", "13": "SP", "14": "SP", "15": "SP", "16": "SP", "17": "SP", "18": "SP", "19": "SP",
  // Rio de Janeiro
  "21": "RJ", "22": "RJ", "24": "RJ",
  // Espírito Santo
  "27": "ES", "28": "ES",
  // Minas Gerais
  "31": "MG", "32": "MG", "33": "MG", "34": "MG", "35": "MG", "37": "MG", "38": "MG",
  // Paraná
  "41": "PR", "42": "PR", "43": "PR", "44": "PR", "45": "PR", "46": "PR",
  // Santa Catarina
  "47": "SC", "48": "SC", "49": "SC",
  // Rio Grande do Sul
  "51": "RS", "53": "RS", "54": "RS", "55": "RS",
  // Distrito Federal
  "61": "DF",
  // Goiás
  "62": "GO", "64": "GO",
  // Tocantins
  "63": "TO",
  // Mato Grosso
  "65": "MT", "66": "MT",
  // Mato Grosso do Sul
  "67": "MS",
  // Acre
  "68": "AC",
  // Rondônia
  "69": "RO",
  // Bahia
  "71": "BA", "73": "BA", "74": "BA", "75": "BA", "77": "BA",
  // Sergipe
  "79": "SE",
  // Pernambuco
  "81": "PE", "87": "PE",
  // Alagoas
  "82": "AL",
  // Paraíba
  "83": "PB",
  // Rio Grande do Norte
  "84": "RN",
  // Ceará
  "85": "CE", "88": "CE",
  // Piauí
  "86": "PI", "89": "PI",
  // Maranhão
  "98": "MA", "99": "MA",
  // Pará
  "91": "PA", "93": "PA", "94": "PA",
  // Amazonas
  "92": "AM", "97": "AM",
  // Roraima
  "95": "RR",
  // Amapá
  "96": "AP",
};

export const stateNames: Record<string, string> = {
  "AC": "Acre",
  "AL": "Alagoas",
  "AM": "Amazonas",
  "AP": "Amapá",
  "BA": "Bahia",
  "CE": "Ceará",
  "DF": "Distrito Federal",
  "ES": "Espírito Santo",
  "GO": "Goiás",
  "MA": "Maranhão",
  "MG": "Minas Gerais",
  "MS": "Mato Grosso do Sul",
  "MT": "Mato Grosso",
  "PA": "Pará",
  "PB": "Paraíba",
  "PE": "Pernambuco",
  "PI": "Piauí",
  "PR": "Paraná",
  "RJ": "Rio de Janeiro",
  "RN": "Rio Grande do Norte",
  "RO": "Rondônia",
  "RR": "Roraima",
  "RS": "Rio Grande do Sul",
  "SC": "Santa Catarina",
  "SE": "Sergipe",
  "SP": "São Paulo",
  "TO": "Tocantins",
};

export function extractDddFromPhone(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('55') && cleaned.length >= 4) {
    return cleaned.substring(2, 4);
  }
  
  if (cleaned.length >= 2 && cleaned.length <= 11) {
    return cleaned.substring(0, 2);
  }
  
  return null;
}

export function getStateFromPhone(phone: string): string {
  const ddd = extractDddFromPhone(phone);
  if (!ddd) return "Desconhecido";
  return dddToState[ddd] || "Desconhecido";
}

export function getStateNameFromCode(code: string): string {
  return stateNames[code] || code;
}
