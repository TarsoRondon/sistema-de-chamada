const clients = new Map();
let clientCounter = 0;

function addSseClient({ res, organizationId, turmaId }) {
  const clientId = ++clientCounter;
  clients.set(clientId, {
    res,
    organizationId: Number(organizationId),
    turmaId: turmaId ? Number(turmaId) : null,
  });

  res.write(`event: ready\ndata: ${JSON.stringify({ ok: true, clientId })}\n\n`);

  return () => {
    clients.delete(clientId);
  };
}

function broadcastAttendanceEvent(payload) {
  for (const [clientId, client] of clients.entries()) {
    const matchesOrg = client.organizationId === Number(payload.organizationId);
    const matchesTurma = !client.turmaId || Number(client.turmaId) === Number(payload.turmaId);

    if (!matchesOrg || !matchesTurma) {
      continue;
    }

    try {
      client.res.write(`event: attendance\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch (error) {
      clients.delete(clientId);
    }
  }
}

module.exports = {
  addSseClient,
  broadcastAttendanceEvent,
};
