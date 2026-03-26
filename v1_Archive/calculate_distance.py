"""
================================================================
FILE: haversine_test.py (Core Mathematical Logic)
DESCRIPTION: Independent script to calculate the great-circle 
             distance between two points on a sphere (Earth).
================================================================
"""

import math

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Implements the Haversine formula to find the shortest distance 
    over the earth's surface (Great-circle distance).
    """
    # Earth's radius in kilometers
    R = 6371.0
    
    # Converting degrees to radians for mathematical functions
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    
    diff_lat = math.radians(lat2 - lat1)
    diff_lon = math.radians(lon2 - lon1)

    # The Haversine formula calculation
    a = math.sin(diff_lat / 2)**2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * \
        math.sin(diff_lon / 2)**2
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    # Returning final result in km
    return R * c

# ================================================================
# TEST CASE: Bhopal Local Coordinates
# ================================================================
if __name__ == "__main__":
    # Current Location (Example: Near MP Nagar)
    my_lat, my_lon = 23.2599, 77.4126
    
    # Shop Location (Example: Near New Market)
    shop_lat, shop_lon = 23.2494, 77.3910

    dist = calculate_distance(my_lat, my_lon, shop_lat, shop_lon)

    print("-" * 40)
    print(f"📍 Start: {my_lat}, {my_lon}")
    print(f"🏁 End:   {shop_lat}, {shop_lon}")
    print(f"📏 Distance: {dist:.2f} km")
    print("-" * 40)