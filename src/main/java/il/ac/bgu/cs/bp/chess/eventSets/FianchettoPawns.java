package il.ac.bgu.cs.bp.chess.eventSets;

import il.ac.bgu.cs.bp.bpjs.model.BEvent;
import il.ac.bgu.cs.bp.bpjs.model.eventsets.EventSet;

import java.util.Collection;
import java.util.Map;
import java.util.NoSuchElementException;

public class FianchettoPawns implements EventSet {
    /*
    const ESFianchettoMoves = bp.EventSet("ESfianchettoMoves", function (e) {
    return e.name == 'Move' &&  e.data.dst[1] == '3' &&
      ( e.data.dst[0] == 'b' || e.data.dst[0] == 'g' ) })
     */
    @Override
    public boolean contains(BEvent bEvent) {
        if (bEvent.name.equals("Move") && bEvent.maybeData != null) {
            try {

                Map<String, Object> eData = (Map<String, Object>) bEvent.getDataField().get();
                var destinationCell = eData.get("dst");
                return ( destinationCell.toString().charAt(1) == '3' || destinationCell.toString().charAt(1) == '4' )
                        && ( destinationCell.toString().charAt(0) == 'b' || destinationCell.toString().charAt(0) == 'g');

            } catch (NoSuchElementException e) {
                return false;
            }
        }
        return false;
    }
}
