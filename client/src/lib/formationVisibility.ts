export type FormationTrackWithModules<TModule extends { isActive?: boolean | null }> = {
  modules: TModule[];
};

export function getVisibleFormationTracks<TModule extends { isActive?: boolean | null }, TTrack extends FormationTrackWithModules<TModule>>(
  tracks: TTrack[],
  _isAdmin: boolean
): TTrack[] {
  return tracks
    .map((track) => ({
      ...track,
      modules: track.modules.filter((module) => module.isActive !== false),
    }))
    .filter((track) => track.modules.length > 0);
}
