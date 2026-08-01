/** Browser spec reader — fetches data/*.json over HTTP. */
export function browserReader(baseUrl = './data') {
  return async (name) => {
    const res = await fetch(`${baseUrl}/${name}`);
    if (!res.ok) throw new Error(`failed to fetch ${name}: HTTP ${res.status}`);
    return res.json();
  };
}
