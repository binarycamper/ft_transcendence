export default function fetchUrl(port:string, urlAppendage:string): string {
  let domain = window.location.origin;
  let pos = domain.indexOf(':', 7);
  let ret;
  if (pos == -1) {
    ret = `${domain}:${port}${urlAppendage}`;
  } else {
    ret = `${domain.substring(0, pos)}:${port}${urlAppendage}`;
  }
  return ret;
}

export function fetchWsUrl(port:string): string {
  let domain = window.location.origin;
  let pos1 = domain.indexOf(':');
  let pos2 = domain.indexOf(':', 7);
  let ret;
  if (pos2 == -1) {
    ret = `ws${domain.substring(pos1)}:${port}`;
  } else {
    ret = `ws${domain.substring(pos1, pos2)}:${port}`;
  }
  return ret;
}
