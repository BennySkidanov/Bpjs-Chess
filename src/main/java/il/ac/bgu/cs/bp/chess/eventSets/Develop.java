package il.ac.bgu.cs.bp.chess.eventSets;

import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.eventsets.EventSet;
import il.ac.bgu.cs.bp.bpjs.model.eventsets.EventSets;

public class Develop implements EventSet {
    private EventSet es = EventSets.anyOf ( new DevelopPawns() );
    @Override
    public boolean contains(BEvent bEvent) {
        return es.contains(bEvent);
    }
}
