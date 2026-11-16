// Every request, as it is, to the Worker that is the server.
export const onRequest = ({ request, env }) => env.API.fetch(request)
