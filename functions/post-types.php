<?php 
/* Custom Post Types */
//DASH ICONS = https://developer.wordpress.org/resource/dashicons/
add_action('init', 'js_custom_init', 1);
function js_custom_init() {
    $post_types = array(
        array(
            'post_type' => 'portfolio',
            'menu_name' => 'Portfolio',
            'plural'    => 'Portfolio',
            'single'    => 'Portfolio',
            'supports'  => array('title','editor','thumbnail')
        ),
        array(
            'post_type' => 'services',
            'menu_name' => 'Services',
            'plural'    => 'Services',
            'single'    => 'Service',
            'supports'  => array('title','editor','thumbnail')
        ),
        array(
            'post_type' => 'people',
            'menu_name' => 'People',
            'plural'    => 'People',
            'single'    => 'People',
            'supports'  => array('title','editor','thumbnail')
        ),
    );
    
    if($post_types) {
        foreach ($post_types as $p) {
            $p_type = ( isset($p['post_type']) && $p['post_type'] ) ? $p['post_type'] : ""; 
            $single_name = ( isset($p['single']) && $p['single'] ) ? $p['single'] : "Custom Post"; 
            $plural_name = ( isset($p['plural']) && $p['plural'] ) ? $p['plural'] : "Custom Post"; 
            $menu_name = ( isset($p['menu_name']) && $p['menu_name'] ) ? $p['menu_name'] : $p['plural']; 
            $menu_icon = ( isset($p['menu_icon']) && $p['menu_icon'] ) ? $p['menu_icon'] : "dashicons-admin-post"; 
            $supports = ( isset($p['supports']) && $p['supports'] ) ? $p['supports'] : array('title','editor','custom-fields','thumbnail'); 
            $taxonomies = ( isset($p['taxonomies']) && $p['taxonomies'] ) ? $p['taxonomies'] : array(); 
            $parent_item_colon = ( isset($p['parent_item_colon']) && $p['parent_item_colon'] ) ? $p['parent_item_colon'] : ""; 
            $menu_position = ( isset($p['menu_position']) && $p['menu_position'] ) ? $p['menu_position'] : 20; 
            
            
            if($p_type) {
                
                $labels = array(
                    'name' => _x($plural_name, 'post type general name'),
                    'singular_name' => _x($single_name, 'post type singular name'),
                    'add_new' => _x('Add New', $single_name),
                    'add_new_item' => __('Add New ' . $single_name),
                    'edit_item' => __('Edit ' . $single_name),
                    'new_item' => __('New ' . $single_name),
                    'view_item' => __('View ' . $single_name),
                    'search_items' => __('Search ' . $plural_name),
                    'not_found' =>  __('No ' . $plural_name . ' found'),
                    'not_found_in_trash' => __('No ' . $plural_name . ' found in Trash'), 
                    'parent_item_colon' => $parent_item_colon,
                    'menu_name' => $menu_name
                );
            
            
                $args = array(
                    'labels' => $labels,
                    'public' => true,
                    'publicly_queryable' => true,
                    'show_ui' => true, 
                    'show_in_menu' => true, 
                    'show_in_rest' => true,
                    'query_var' => true,
                    'rewrite' => true,
                    'capability_type' => 'post',
                    'has_archive' => false, 
                    'hierarchical' => false, // 'false' acts like posts 'true' acts like pages
                    'menu_position' => $menu_position,
                    'menu_icon'=> $menu_icon,
                    'supports' => $supports
                ); 
                
                register_post_type($p_type,$args); // name used in query
                
            }
            
        }
    }
}

// Add new taxonomy, make it hierarchical (like categories)
add_action( 'init', 'ii_custom_taxonomies', 0 );
function ii_custom_taxonomies() {
        $posts = array();
    
    if($posts) {
        foreach($posts as $p) {
            $p_type = ( isset($p['post_type']) && $p['post_type'] ) ? $p['post_type'] : ""; 
            $single_name = ( isset($p['single']) && $p['single'] ) ? $p['single'] : "Custom Post"; 
            $plural_name = ( isset($p['plural']) && $p['plural'] ) ? $p['plural'] : "Custom Post"; 
            $menu_name = ( isset($p['menu_name']) && $p['menu_name'] ) ? $p['menu_name'] : $p['plural'];
            $taxonomy = ( isset($p['taxonomy']) && $p['taxonomy'] ) ? $p['taxonomy'] : "";
            $rewrite_slug = ( isset($p['slug']) && $p['slug'] ) ? $p['slug'] : array( 'slug' => $taxonomy );
            
            
            if( $taxonomy && $p_type ) {
                $labels = array(
                    'name' => _x( $menu_name, 'taxonomy general name' ),
                    'singular_name' => _x( $single_name, 'taxonomy singular name' ),
                    'search_items' =>  __( 'Search ' . $plural_name ),
                    'popular_items' => __( 'Popular ' . $plural_name ),
                    'all_items' => __( 'All ' . $plural_name ),
                    'parent_item' => __( 'Parent ' .  $single_name),
                    'parent_item_colon' => __( 'Parent ' . $single_name . ':' ),
                    'edit_item' => __( 'Edit ' . $single_name ),
                    'update_item' => __( 'Update ' . $single_name ),
                    'add_new_item' => __( 'Add New ' . $single_name ),
                    'new_item_name' => __( 'New ' . $single_name ),
                  );

              register_taxonomy($taxonomy,array($p_type), array(
                'hierarchical' => true,
                'labels' => $labels,
                'show_ui' => true,
                'show_in_rest' => true,
                'show_admin_column' => true,
                'query_var' => true,
                'rewrite' => $rewrite_slug,
              ));
            }
            
        }
    }
}

// Add the custom columns to the position post type:
add_filter( 'manage_posts_columns', 'set_custom_cpt_columns' );
function set_custom_cpt_columns($columns) {
    global $wp_query;
    $query = isset($wp_query->query) ? $wp_query->query : '';
    $post_type = ( isset($query['post_type']) ) ? $query['post_type'] : '';
    
    if($post_type=='portfolio') {
        unset( $columns['taxonomy-portcats'] );
        unset( $columns['date'] );
        $columns['status'] = __( 'Status', 'bellaworks' );
        $columns['services'] = __( 'Services', 'bellaworks' );
        $columns['taxonomy-portcats'] = __( 'Category', 'bellaworks' );
        $columns['date'] = __( 'Date', 'bellaworks' );
    }

    return $columns;
}

// Add the data to the custom columns for the book post type:
add_action( 'manage_posts_custom_column' , 'custom_post_column', 10, 2 );
function custom_post_column( $column, $post_id ) {
    global $wp_query;
    $query = isset($wp_query->query) ? $wp_query->query : '';
    $post_type = ( isset($query['post_type']) ) ? $query['post_type'] : '';
    
    if($post_type=='portfolio') {
        $wpURL = get_admin_url() . 'edit.php?post_type=' . $post_type;
        switch ( $column ) {
            case 'status' :
                // completed : Completed
                // unbuilt : Unbuilt
                // inprocess : In Process
                $status = get_field('status',$post_id);
                $status_text = '';
                if($status=='inprocess') {
                    $status_text = '<a href="'.$wpURL.'&status=inprocess">In Process</a>';
                } else {
                    if($status) {
                        $status_text = '<a href="'.$wpURL.'&status='.$status.'">'.ucwords($status).'</a>';
                    } else {
                        $status_text = ' &ndash; ';
                    }
                }
                echo $status_text;
                break;
            case 'services' :
                $services = get_field('tag_services',$post_id);
                $servicesList='';
                if($services) {
                    $i=1; foreach($services as $s) {
                        $comma = ($i>1) ? ', ':'';
                        $servicesList .= '<a href="'.$wpURL.'&service='.$s->ID.'">' . $comma . $s->post_title . '</a>';
                        $i++;
                    }
                }
                echo $servicesList;
        }
    }
    
}


add_action( 'pre_get_posts', 'custom_filter_pre_get_posts' );
function custom_filter_pre_get_posts( $query ) {
    
    if ( is_admin() && in_array ( $query->get('post_type'), array('portfolio') ) ) {

        $status = ( isset($_GET['status']) && $_GET['status'] ) ? $_GET['status'] : '';
        if($status) {
            $query->set( 'meta_key', 'status' );
            $query->set( 'meta_value', $status ); 
        }

        $status = ( isset($_GET['status']) && $_GET['status'] ) ? $_GET['status'] : '';
        if($status) {
            $query->set( 'meta_key', 'status' );
            $query->set( 'meta_value', $status ); 
        }

        $service = ( isset($_GET['service']) && $_GET['service'] ) ? $_GET['service'] : '';
        if($service) {
            $query->set( 'meta_query', array(
                array(
                  'key'     => 'tag_services',
                  'value'   => $service,
                  'compare' => 'REGEXP',
                )
            ) );
        }
        return;

    }
 
}

