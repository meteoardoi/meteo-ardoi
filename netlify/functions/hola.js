exports.handler = async function () {
  return {
    statusCode: 200,
    body: "Funciona. Node " + process.version +
          " | key: " + (process.env.WU_API_KEY ? "OK" : "NO") +
          " | estacion: " + (process.env.WU_STATION_ID ? "OK" : "NO")
  };
};
