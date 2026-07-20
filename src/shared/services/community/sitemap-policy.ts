export function getCommunitySitemapStaticRoutes(hasMigratedAbout: boolean) {
  return [
    '',
    '/resources',
    '/collections',
    '/blog',
    '/submit',
    ...(hasMigratedAbout ? [] : ['/about']),
  ];
}
