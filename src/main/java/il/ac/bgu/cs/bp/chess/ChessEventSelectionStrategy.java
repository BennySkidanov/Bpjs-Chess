package il.ac.bgu.cs.bp.chess;

import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.BProgramSyncSnapshot;
import il.ac.bgu.cs.bp.bpjs.model.eventselection.EventSelectionResult;
import il.ac.bgu.cs.bp.bpjs.model.eventselection.SimpleEventSelectionStrategy;

import java.util.Optional;
import java.util.Set;

public class ChessEventSelectionStrategy extends SimpleEventSelectionStrategy {
  @Override
  public Optional<EventSelectionResult> select(BProgramSyncSnapshot bpss, Set<BEvent> selectableEvents) {
    var ctx = bpss.getDataStore();
    return super.select(bpss, selectableEvents);
  }
}
