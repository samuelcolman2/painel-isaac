const analyzeBillingData = async (data: any[]): Promise<any> => {
  return Promise.resolve({
    summary: "A análise por IA está desativada no momento.",
    anomalies: ["Funcionalidade desativada."],
    recommendations: ["Para habilitar recomendações, configure a chave de API."],
    financialTrend: "Indisponível"
  });
};

export { analyzeBillingData };
