import Next from "next";
import fastify, { FastifyRequest } from "fastify";

const app = fastify({
 logger: { level: "error" },
 pluginTimeout: 0,
});

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";

console.log("Server running");

interface RequestParams {
 location: string;
}

app.get("/api/:location", (req: FastifyRequest<{ Params: RequestParams }>, reply) => {
 console.log("We got triggered in /api");
 return reply.send({ body: { location: req.params.location } });
});


app.register((fastify, opts, next) => {
 const app = Next({ dev });
 const handle = app.getRequestHandler();

 fastify.get("/_next/*", (req, reply) => {
  return handle(req.raw, reply.raw).then(() => {
   reply.sent = true;
  });
 });

 fastify.get("/*", (req, reply) => {
  return handle(req.raw, reply.raw).then(() => {
   reply.sent = true;
  });
 });

 fastify.all("/*", (req, reply) => {
  console.log("Capture * called");
  return handle(req.raw, reply.raw).then(() => {
   reply.sent = true;
  });
 });

 fastify.get("/a", (req, reply) => {
  return app.render(req.raw, reply.raw, "/a", req.query).then(() => {
   reply.sent = true;
  });
 });

 fastify.get("/b", (req, reply) => {
  return app.render(req.raw, reply.raw, "/b", req.query).then(() => {
   reply.sent = true;
  });
 });

 fastify.setNotFoundHandler((request, reply) => {
  console.log("404 hit");
  return app.render404(request.raw, reply.raw).then(() => {
   reply.sent = true;
  });
 });
 next();
}).catch((err: Error) => next(err));
}); 

app.listen(port, (err) => {
 if (err) throw err;
 console.log(`> Ready on http://localhost:${port}`);
});
