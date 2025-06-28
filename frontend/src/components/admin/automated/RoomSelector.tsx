import { useEffect, useState } from 'react';

interface RoomSelectorProps {
  rooms: any[];
  value: string[];
  onChange: (selected: string[]) => void;
}

const RoomSelector = ({ rooms, value, onChange }: RoomSelectorProps) => {
  const [allAmenities, setAllAmenities] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  useEffect(() => {
    const amenitiesSet = new Set<string>();
    rooms.forEach((room: any) => {
      (room.amenities || []).forEach((a: string) => amenitiesSet.add(a));
    });
    setAllAmenities(Array.from(amenitiesSet));
  }, [rooms]);

  const filteredRooms = selectedAmenities.length === 0
    ? rooms
    : rooms.filter((r: any) =>
        selectedAmenities.every(a => (r.amenities || []).includes(a))
      );

  const handleRoomChange = (roomId: string, checked: boolean) => {
    if (checked) {
      onChange([...value, roomId]);
    } else {
      onChange(value.filter(id => id !== roomId));
    }
  };

  return (
    <div>
      {allAmenities.length > 0 && (
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Filter by Amenities</label>
          <div className="flex flex-wrap gap-2">
            {allAmenities.map(a => (
              <label key={a} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={selectedAmenities.includes(a)}
                  onChange={e => {
                    setSelectedAmenities(
                      e.target.checked
                        ? [...selectedAmenities, a]
                        : selectedAmenities.filter(x => x !== a)
                    );
                  }}
                />
                {a}
              </label>
            ))}
          </div>
        </div>
      )}
      <label className="block text-sm font-medium mb-1">Rooms</label>
      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
        {filteredRooms.length === 0 && <div className="text-xs text-gray-400">No rooms match selected amenities.</div>}
        {filteredRooms.map((r: any) => (
          <label key={r.id} className="flex items-center gap-2 text-sm mb-1">
            <input
              type="checkbox"
              checked={value.includes(r.id)}
              onChange={e => handleRoomChange(r.id, e.target.checked)}
            />
            <span>{r.name} {r.amenities && r.amenities.length > 0 ? `(${r.amenities.join(', ')})` : ''}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default RoomSelector; 