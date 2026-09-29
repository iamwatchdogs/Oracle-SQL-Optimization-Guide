/*
 * Where the notebook's source lives.
 *
 * Both the header trigger and the footer colophon point here, so the remote is
 * written once. `REPO_PATH` is derived rather than restated: a repository URL and
 * the host/path string printed next to a compile date are the same fact, and two
 * literals would be free to disagree.
 *
 * `REPO_URL` is the one place the remote is written. Replace it there; the
 * derived label follows it.
 *
 * The repository is not created yet, so this link is live before its target
 * exists. That is deliberate and temporary — it is here so the chrome is final
 * and the URL becomes correct the moment the first push lands.
 */
export const REPO_URL = 'https://github.com/iamwatchdogs/Oracle-SQL-Optimization-Guide';

export const REPO_PATH = REPO_URL.replace(/^https?:\/\//u, '').replace(/\/+$/u, '');
